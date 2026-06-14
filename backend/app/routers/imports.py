from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..db import get_db
from ..models import ClimateSeries, Department, Event, ImportLog, Meeting, QualityMetric
from ..parsers.xlsx import (
    DEPARTMENT_DEFAULTS,
    parse_department_xlsx,
    parse_meetings_xlsx,
)

router = APIRouter()


def _ensure_department(db: Session, dept_id: str) -> Department:
    dept = db.get(Department, dept_id)
    if not dept:
        name, short = DEPARTMENT_DEFAULTS.get(dept_id, (dept_id, dept_id))
        dept = Department(id=dept_id, name=name, short_name=short)
        db.add(dept)
        db.flush()
    return dept


def _apply_department_payload(db: Session, payload: dict[str, Any]) -> dict[str, int]:
    dept_id = payload["department_id"]
    _ensure_department(db, dept_id)

    db.execute(delete(QualityMetric).where(QualityMetric.department_id == dept_id))
    for m in payload["quality"]:
        db.add(QualityMetric(**m))

    db.execute(delete(Event).where(Event.department_id == dept_id))
    existing_notes = {}  # no preservation across re-import for MVP
    for e in payload["events"]:
        db.add(Event(notes=existing_notes.get(e["id"], ""), **e))

    db.execute(delete(ClimateSeries).where(ClimateSeries.department_id == dept_id))
    db.add(ClimateSeries(**payload["climate"]))

    db.commit()
    return {
        "quality": len(payload["quality"]),
        "events": len(payload["events"]),
        "climate": 1,
    }


def _apply_meetings_payload(db: Session, meetings: list[dict[str, Any]]) -> int:
    db.execute(delete(Meeting))
    for m in meetings:
        db.add(Meeting(**m))
    db.commit()
    return len(meetings)


@router.post("/department/{dept_id}")
async def import_department(
    dept_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    identity: str = Depends(require_auth),
) -> dict[str, Any]:
    if dept_id not in DEPARTMENT_DEFAULTS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unknown department {dept_id}")
    suffix = Path(file.filename or "upload.xlsx").suffix or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp.flush()
        payload = parse_department_xlsx(Path(tmp.name), dept_id)
    counts = _apply_department_payload(db, payload)
    db.add(ImportLog(identity=identity, kind="department", department_id=dept_id, file_name=file.filename or "", summary=counts))
    db.commit()
    return {"department": dept_id, **counts}


@router.post("/meetings")
async def import_meetings(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    identity: str = Depends(require_auth),
) -> dict[str, Any]:
    suffix = Path(file.filename or "upload.xlsx").suffix or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp.flush()
        meetings = parse_meetings_xlsx(Path(tmp.name))
    count = _apply_meetings_payload(db, meetings)
    db.add(ImportLog(identity=identity, kind="meetings", department_id=None, file_name=file.filename or "", summary={"meetings": count}))
    db.commit()
    return {"meetings": count}


@router.post("/bootstrap")
def bootstrap_from_downloads(
    db: Session = Depends(get_db),
    identity: str = Depends(require_auth),
) -> dict[str, Any]:
    """Удобный dev-эндпоинт: тянет xlsx из ~/Downloads, заполняет БД."""
    downloads = Path.home() / "Downloads"
    sources = [
        ("sport", downloads / "Дашборд Спорт.xlsx"),
        ("culture", downloads / "11.06.2026" / "0_Дашборд КК.xlsx"),
        ("communications", downloads / "11.06.2026" / "Дашборд ВК (1) (1).xlsx"),
    ]
    meetings_path = downloads / "Telegram Desktop" / "Календарь совещаний_ДККиУР.xlsx"

    result: dict[str, Any] = {"departments": {}, "missing": []}
    for dept_id, path in sources:
        if not path.exists():
            result["missing"].append(str(path))
            continue
        payload = parse_department_xlsx(path, dept_id)
        result["departments"][dept_id] = _apply_department_payload(db, payload)
        db.add(ImportLog(identity=identity, kind="bootstrap-department", department_id=dept_id, file_name=path.name, summary=result["departments"][dept_id]))

    if meetings_path.exists():
        meetings = parse_meetings_xlsx(meetings_path)
        result["meetings"] = _apply_meetings_payload(db, meetings)
        db.add(ImportLog(identity=identity, kind="bootstrap-meetings", department_id=None, file_name=meetings_path.name, summary={"meetings": result["meetings"]}))
    else:
        result["missing"].append(str(meetings_path))

    # Подсчёт того, что есть в БД, и отдаём вместе с departments-списком
    deps = db.scalars(select(Department)).all()
    result["loaded_departments"] = [{"id": d.id, "short_name": d.short_name, "name": d.name} for d in deps]
    db.commit()
    return result
