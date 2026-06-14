"""xlsx-парсер дашбордов ДККиУР.

Адаптировано из dkkiur-dashboard/scripts/import_xlsx.py (Codex). Здесь
парсер возвращает структуры данных, а не пишет JSON; код вызова решает,
сохранять в БД или показывать превью.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zipfile import ZipFile

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

DEPARTMENT_DEFAULTS = {
    "sport": ("Отдел корпоративного спорта", "Спорт"),
    "culture": ("Отдел развития корпоративной культуры и сообщества", "КК"),
    "communications": ("Отдел корпоративных коммуникаций", "ВК"),
}


def col_to_num(col: str) -> int:
    result = 0
    for char in col:
        result = result * 26 + ord(char.upper()) - 64
    return result


def num_to_col(num: int) -> str:
    result = ""
    while num:
        num, rem = divmod(num - 1, 26)
        result = chr(65 + rem) + result
    return result


CELL_RE = re.compile(r"([A-Z]+)(\d+)")


def split_cell(ref: str) -> tuple[int, int]:
    match = CELL_RE.match(ref)
    if not match:
        return 0, 0
    return col_to_num(match.group(1)), int(match.group(2))


def excel_date(value: Any) -> str:
    if value in (None, ""):
        return ""
    text = str(value).strip()
    if not text:
        return ""
    try:
        serial = float(text)
    except ValueError:
        return text
    if serial < 20000:
        return text
    dt = datetime(1899, 12, 30) + timedelta(days=serial)
    return dt.strftime("%d.%m.%Y")


def excel_time(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        number = float(text)
    except ValueError:
        return text
    if 0 <= number < 1:
        minutes = round(number * 24 * 60)
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
    return text


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def clean_number(value: Any) -> float | None:
    text = clean_text(value).replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _read_xml(zip_file: ZipFile, name: str) -> ET.Element:
    return ET.fromstring(zip_file.read(name))


def _rels_map(zip_file: ZipFile, path: str) -> dict[str, dict[str, str]]:
    if path not in zip_file.namelist():
        return {}
    root = _read_xml(zip_file, path)
    return {rel.attrib.get("Id", ""): dict(rel.attrib) for rel in root.findall("rel:Relationship", NS)}


def _shared_strings(zip_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []
    root = _read_xml(zip_file, "xl/sharedStrings.xml")
    strings = []
    for item in root.findall("main:si", NS):
        strings.append("".join(node.text or "" for node in item.findall(".//main:t", NS)))
    return strings


def _workbook_sheets(zip_file: ZipFile) -> dict[str, str]:
    workbook = _read_xml(zip_file, "xl/workbook.xml")
    rels = _rels_map(zip_file, "xl/_rels/workbook.xml.rels")
    result: dict[str, str] = {}
    for sheet in workbook.find("main:sheets", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib.get(f"{{{NS['r']}}}id", "")
        target = rels[rel_id]["Target"]
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        result[name] = target
    return result


def _cell_value(cell: ET.Element, strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", NS)
    inline_node = cell.find("main:is", NS)
    if cell_type == "s" and value_node is not None:
        try:
            return strings[int(value_node.text or "0")]
        except (ValueError, IndexError):
            return ""
    if cell_type == "inlineStr" and inline_node is not None:
        return "".join(node.text or "" for node in inline_node.findall(".//main:t", NS))
    if value_node is not None:
        return value_node.text or ""
    return ""


def read_sheet(zip_file: ZipFile, sheet_name: str) -> dict[str, str]:
    sheets = _workbook_sheets(zip_file)
    if sheet_name not in sheets:
        return {}
    strings = _shared_strings(zip_file)
    root = _read_xml(zip_file, sheets[sheet_name])
    cells: dict[str, str] = {}
    for cell in root.findall(".//main:c", NS):
        ref = cell.attrib.get("r")
        value = clean_text(_cell_value(cell, strings))
        if ref and value:
            cells[ref] = value
    return cells


def value_at(cells: dict[str, str], col: int | str, row: int) -> str:
    name = col if isinstance(col, str) else num_to_col(col)
    return cells.get(f"{name}{row}", "")


def row_values(cells: dict[str, str], row: int, start_col: int, end_col: int) -> list[str]:
    return [value_at(cells, col, row) for col in range(start_col, end_col + 1)]


def first_filled(values: list[str]) -> str:
    for value in values:
        if value:
            return value
    return ""


def status_from_traffic(status: str, traffic: str) -> str:
    if status:
        return status
    return {"0": "Проблема", "1": "В работе", "2": "В работе", "3": "Завершено"}.get(traffic, "")


def traffic_label(traffic: str) -> str:
    return {"0": "Красный", "1": "Жёлтый", "2": "Зелёный", "3": "Завершено"}.get(traffic, "")


def parse_quality(dept_id: str, dept_short: str, cells: dict[str, str]) -> list[dict[str, Any]]:
    starts: list[int] = []
    for ref, value in cells.items():
        col, row = split_cell(ref)
        lowered = value.lower()
        is_metric_heading = lowered.startswith("показатель") and (":" in lowered or re.match(r"показатель\s*\d+", lowered))
        if col <= 2 and is_metric_heading:
            starts.append(row)
    starts = sorted(set(starts))
    metrics: list[dict[str, Any]] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] - 1 if index + 1 < len(starts) else start + 28
        title = first_filled(row_values(cells, start, 1, 4))
        title = re.sub(r"^Показатель\s*\d*:\s*", "", title, flags=re.I).strip() or title
        goal = periodicity = owner = comment = ""
        for row in range(start + 1, min(end, start + 10) + 1):
            joined = " ".join(row_values(cells, row, 1, 5))
            low = joined.lower()
            if "цель" in low and not goal:
                goal = joined.replace("Цель:", "").replace("Цель", "").strip(": ")
            elif "периодичность" in low and not periodicity:
                periodicity = (
                    joined.replace("Периодичность заполнения", "")
                    .replace("Периодичность:", "")
                    .replace("Периодичность", "")
                    .strip(" —:-")
                )
            elif "ответствен" in low and not owner:
                owner = joined.replace("Ответственные:", "").replace("Ответственный:", "").strip()
            elif "комментар" in low and not comment:
                comment = joined.replace("Комментарий:", "").strip()

        period_row = None
        for row in range(start, min(end, start + 30) + 1):
            labels = [item.lower() for item in row_values(cells, row, 1, 6) if item]
            if any(label in {"период", "период недели", "неделя"} for label in labels):
                period_row = row
                break

        series: list[dict[str, Any]] = []
        fact_label = ""
        target_label = ""
        latest_fact = latest_target = None
        latest_period = ""
        progress = None
        status = "Нет данных"

        if period_row:
            periods = row_values(cells, period_row, 2, 23)
            fact_row = target_row = status_row = None
            for row in range(period_row + 1, min(end, period_row + 8) + 1):
                label = value_at(cells, 1, row) or value_at(cells, 2, row)
                low = label.lower()
                if not fact_row and any(token in low for token in ["факт", "показатель", "итог", "enps", "просмотр", "статус"]):
                    if "статус" not in low:
                        fact_row = row
                        fact_label = label
                if not target_row and "цель" in low:
                    target_row = row
                    target_label = label
                if not status_row and "статус" in low:
                    status_row = row

            if not fact_row:
                for row in range(period_row + 1, min(end, period_row + 8) + 1):
                    values = [clean_number(value_at(cells, col, row)) for col in range(2, 24)]
                    if any(value is not None for value in values):
                        fact_row = row
                        fact_label = value_at(cells, 1, row) or value_at(cells, 2, row)
                        break

            for col in range(2, 24):
                period = periods[col - 2]
                fact = clean_number(value_at(cells, col, fact_row)) if fact_row else None
                target = clean_number(value_at(cells, col, target_row)) if target_row else None
                marker = value_at(cells, col, status_row) if status_row else ""
                if period or fact is not None or target is not None or marker:
                    point = {"period": period or f"{col - 1}", "fact": fact, "target": target, "marker": marker}
                    series.append(point)
                    if fact is not None or marker:
                        latest_fact = fact
                        latest_target = target
                        latest_period = point["period"]

            if latest_fact is not None and latest_target not in (None, 0):
                progress = latest_fact / latest_target
                status = "В норме" if progress >= 1 else "Ниже цели"
            elif latest_fact is not None:
                status = "Есть факт"
            elif any(point.get("marker") for point in series):
                status = "Отмечен статус"

        metrics.append(
            {
                "id": f"{dept_id}-q{index + 1}",
                "department_id": dept_id,
                "title": title,
                "goal": goal,
                "periodicity": periodicity,
                "owner": owner,
                "comment": comment,
                "fact_label": fact_label,
                "target_label": target_label,
                "latest_period": latest_period,
                "latest_fact": latest_fact,
                "latest_target": latest_target,
                "progress": progress,
                "status": status,
                "series": series,
            }
        )
    return metrics


def parse_events(dept_id: str, dept_short: str, cells: dict[str, str]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    empty_streak = 0
    for row in range(17, 90):
        name = value_at(cells, "C", row)
        if not name:
            empty_streak += 1
            if empty_streak >= 12:
                break
            continue
        empty_streak = 0
        priority = value_at(cells, "B", row)
        raw_status = value_at(cells, "J", row)
        traffic = value_at(cells, "K", row)
        status = status_from_traffic(raw_status, traffic)
        events.append(
            {
                "id": f"{dept_id}-{row}",
                "department_id": dept_id,
                "row_number": row,
                "number": value_at(cells, "A", row),
                "priority": priority,
                "name": name,
                "owner": value_at(cells, "D", row),
                "curator": value_at(cells, "E", row),
                "moscow_yaroslavl": value_at(cells, "F", row) == "+",
                "electoral_cycle": value_at(cells, "G", row) == "+",
                "deadline": excel_date(value_at(cells, "H", row)),
                "agent": value_at(cells, "I", row),
                "status": status,
                "raw_status": raw_status,
                "traffic": traffic,
                "traffic_label": traffic_label(traffic),
                "budget": value_at(cells, "L", row),
                "is_high_priority": priority.lower() == "высокий",
                "is_done": status.lower() == "завершено" or traffic == "3",
                "is_problem": status.lower() == "проблема" or traffic == "0",
            }
        )
    return events


def parse_climate(dept_id: str, dept_short: str, cells: dict[str, str]) -> dict[str, Any]:
    weeks = []
    for col in range(3, 29):
        week = value_at(cells, col, 22)
        if week:
            weeks.append(week)

    values_by_week: dict[str, list[float]] = defaultdict(list)
    employees: set[str] = set()
    for row in range(23, 80):
        employee = value_at(cells, "B", row)
        if employee:
            employees.add(employee)
        for offset, week in enumerate(weeks, start=3):
            value = clean_number(value_at(cells, offset, row))
            if value is not None:
                values_by_week[week].append(value)

    series = []
    for week in weeks:
        values = values_by_week.get(week, [])
        avg = sum(values) / len(values) if values else None
        series.append({"week": week, "value": avg, "count": len(values)})

    latest = next((point for point in reversed(series) if point["value"] is not None), None)
    target = 3.0
    if latest and latest["value"] is not None:
        status = "В норме" if latest["value"] >= target else "Ниже цели"
    else:
        status = "Нет данных"
    return {
        "department_id": dept_id,
        "title": value_at(cells, "B", 1) or "Моральный климат",
        "question": value_at(cells, "B", 2),
        "target": target,
        "employee_count": len(employees),
        "latest_week": latest["week"] if latest else "",
        "latest_value": latest["value"] if latest else None,
        "status": status,
        "series": series,
    }


def parse_meetings(cells: dict[str, str]) -> list[dict[str, Any]]:
    meetings: list[dict[str, Any]] = []
    for row in range(6, 80):
        name = value_at(cells, "D", row)
        day = value_at(cells, "E", row)
        if not name or not day:
            continue
        days = [part.strip() for part in re.split(r"[/,]", day) if part.strip()] or [day]
        for day_name in days:
            meetings.append(
                {
                    "id": f"meeting-{row}-{len(meetings) + 1}",
                    "source_row": row,
                    "type": value_at(cells, "B", row),
                    "level": value_at(cells, "C", row),
                    "department": name,
                    "day": day_name.lower(),
                    "time": excel_time(value_at(cells, "F", row)),
                    "place": value_at(cells, "G", row),
                    "format": value_at(cells, "H", row),
                    "leader": value_at(cells, "I", row),
                    "leader_phone": value_at(cells, "J", row),
                    "quality_owner": value_at(cells, "K", row),
                    "quality_owner_phone": value_at(cells, "L", row),
                }
            )
    day_order = {"понедельник": 1, "вторник": 2, "среда": 3, "четверг": 4, "пятница": 5}
    meetings.sort(key=lambda item: (day_order.get(item["day"], 99), item["time"]))
    return meetings


def parse_department_xlsx(path: Path, dept_id: str) -> dict[str, Any]:
    """Парсит один xlsx отдела: листы Q (Качество), D (События), M (Климат)."""
    short = DEPARTMENT_DEFAULTS.get(dept_id, ("", dept_id))[1]
    with ZipFile(path) as zf:
        q = read_sheet(zf, "Q")
        d = read_sheet(zf, "D")
        m = read_sheet(zf, "M")
    return {
        "department_id": dept_id,
        "quality": parse_quality(dept_id, short, q),
        "events": parse_events(dept_id, short, d),
        "climate": parse_climate(dept_id, short, m),
    }


def parse_meetings_xlsx(path: Path) -> list[dict[str, Any]]:
    with ZipFile(path) as zf:
        cells = read_sheet(zf, "Календарь совещаний")
    return parse_meetings(cells)


def summary_from(events: list[dict[str, Any]], quality: list[dict[str, Any]], climate: list[dict[str, Any]], meetings: list[dict[str, Any]]) -> dict[str, Any]:
    status_counts = Counter(e["status"] or "Без статуса" for e in events)
    priority_counts = Counter(e["priority"] or "Без приоритета" for e in events)
    done = sum(1 for e in events if e["is_done"])
    high = [e for e in events if e["is_high_priority"]]
    high_done = sum(1 for e in high if e["is_done"])
    problems = sum(1 for e in events if e["is_problem"])
    quality_at_risk = sum(1 for m in quality if m["status"] == "Ниже цели")
    climate_filled = sum(1 for c in climate if c["latest_value"] is not None)
    return {
        "events_total": len(events),
        "events_done": done,
        "events_completion": done / len(events) if events else 0,
        "high_priority_total": len(high),
        "high_priority_done": high_done,
        "high_priority_completion": high_done / len(high) if high else 0,
        "problem_total": problems,
        "quality_total": len(quality),
        "quality_at_risk": quality_at_risk,
        "climate_filled_departments": climate_filled,
        "meetings_total": len(meetings),
        "status_counts": dict(status_counts),
        "priority_counts": dict(priority_counts),
    }
