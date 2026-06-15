import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineEdit } from "../components/InlineEdit";
import { upsertMorale, useMoraleEntries } from "../api/data";
import type { MoraleEntry } from "../types";

// "team" — команда управления (5 закреплённых лиц), остальные — сотрудники отделов
type TabId = "team" | "sport" | "culture" | "communications";

const TEAM_MEMBERS = [
  "Камнева Евгения",
  "Серкова Ольга",
  "Виктор Чумаков",
  "Гущина Валерия",
  "Наиль Якубалиев",
];

const TABS: { id: TabId; label: string }[] = [
  { id: "team", label: "Команда" },
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

// Псевдо-department для команды управления (чтобы запись отличалась в БД)
const TEAM_DEPT_ID = "team";

// Недели 5-26 — те же что в xlsx
const WEEKS = Array.from({ length: 22 }, (_, i) => String(i + 5));
const TARGET = 3;

function heatColor(v: number | null): string {
  if (v === null || v === undefined) return "transparent";
  if (v >= TARGET) return "var(--success-bg)";
  if (v >= TARGET - 1) return "var(--warn-bg)";
  return "var(--danger-bg)";
}

export default function Morale() {
  const { data, loading, reload } = useMoraleEntries();
  const [tab, setTab] = useState<TabId>("team");
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const deptId = tab === "team" ? TEAM_DEPT_ID : tab;
  const tabEntries = useMemo(() => (data ?? []).filter((e) => e.department_id === deptId), [data, deptId]);

  // Список сотрудников для текущего таба
  const employees = useMemo(() => {
    if (tab === "team") return TEAM_MEMBERS;
    const set = new Set<string>(tabEntries.map((e) => e.employee));
    return Array.from(set).sort();
  }, [tab, tabEntries]);

  // employee → week → value
  const grid = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const name of employees) map[name] = {};
    for (const entry of tabEntries) {
      if (!map[entry.employee]) map[entry.employee] = {};
      map[entry.employee][entry.week] = entry.value;
    }
    return map;
  }, [employees, tabEntries]);

  const series = useMemo(() => {
    return WEEKS.map((week) => {
      const values = employees.map((name) => grid[name]?.[week]).filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
      return { week, value: avg, count: values.length };
    });
  }, [grid, employees]);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) if (series[i].value !== null) return series[i];
    return null;
  }, [series]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  async function save(employee: string, week: string, value: number | null) {
    setSavingCell(`${employee}|${week}`);
    try {
      await upsertMorale(deptId, employee, week, value);
      reload();
    } finally {
      setSavingCell(null);
    }
  }

  async function addEmployee() {
    const name = window.prompt("Имя сотрудника:")?.trim();
    if (!name) return;
    // Создаём пустую запись (последняя неделя), чтобы сотрудник появился в гриде
    await upsertMorale(deptId, name, WEEKS[WEEKS.length - 1], null);
    reload();
  }

  const counts = countsByTab(data ?? []);

  return (
    <div>
      <div className="filters">
        {TABS.map((t) => (
          <button key={t.id} className={`filter-chip${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} {counts[t.id] ? <span style={{ opacity: 0.6 }}>· {counts[t.id]}</span> : null}
          </button>
        ))}
      </div>

      <div className="metrics-bar">
        <Metric label="Участников" value={employees.length} />
        <Metric label="Цель" value={`≥ ${TARGET}`} />
        <Metric label="Последняя неделя" value={latest?.week ?? "—"} />
        <Metric label="Среднее" value={latest?.value === null || latest?.value === undefined ? "—" : latest.value.toFixed(2)} />
      </div>

      <div className="morale-grid">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 6px 8px" }}>
          {tab === "team"
            ? "Команда управления ДККиУР. Клик по ячейке — балл 0-5."
            : `Сотрудники отдела «${labelOf(tab)}». Добавь людей кнопкой ниже.`}
        </p>
        <table>
          <thead>
            <tr>
              <th className="sticky">Сотрудник</th>
              {WEEKS.map((w) => (
                <th key={w}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td className="sticky" colSpan={WEEKS.length + 1} style={{ textAlign: "center", color: "var(--text-3)" }}>
                  Сотрудников пока нет. Нажмите «+ Добавить сотрудника».
                </td>
              </tr>
            )}
            {employees.map((name) => (
              <tr key={name}>
                <td className="sticky">{name}</td>
                {WEEKS.map((w) => {
                  const v = grid[name]?.[w] ?? null;
                  const key = `${name}|${w}`;
                  return (
                    <td key={w} style={{ background: heatColor(v), opacity: savingCell === key ? 0.5 : 1 }}>
                      <InlineEdit kind="number" value={v} onSave={(val) => save(name, w, val)} placeholder="—" />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr style={{ fontWeight: 500 }}>
              <td className="sticky">Среднее</td>
              {series.map((p) => (
                <td key={p.week} style={{ background: heatColor(p.value), fontVariantNumeric: "tabular-nums" }}>
                  {p.value === null ? "—" : p.value.toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {tab !== "team" && (
          <button className="add-row" onClick={addEmployee}>
            + Добавить сотрудника
          </button>
        )}
      </div>

      <div className="card">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px" }}>
          Динамика среднего ({labelOf(tab)})
        </p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-2)" }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--text-2)" }} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={TARGET} stroke="var(--danger-fg)" strokeDasharray="3 3" label={{ value: "Цель", fill: "var(--danger-fg)", fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--benefits-bar)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function labelOf(id: TabId): string {
  return TABS.find((t) => t.id === id)?.label ?? id;
}

function countsByTab(entries: MoraleEntry[]): Record<TabId, number> {
  const result: Record<TabId, Set<string>> = {
    team: new Set(),
    sport: new Set(),
    culture: new Set(),
    communications: new Set(),
  };
  for (const e of entries) {
    const id = (e.department_id as TabId) in result ? (e.department_id as TabId) : null;
    if (id) result[id].add(e.employee);
  }
  return {
    team: result.team.size || TEAM_MEMBERS.length,
    sport: result.sport.size,
    culture: result.culture.size,
    communications: result.communications.size,
  };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-mini">
      <p className="l">{label}</p>
      <p className="v">{value}</p>
    </div>
  );
}
