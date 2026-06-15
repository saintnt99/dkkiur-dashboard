import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineEdit } from "../components/InlineEdit";
import { upsertMorale, useMoraleEntries } from "../api/data";

const TEAM_MEMBERS = [
  "Камнева Евгения",
  "Серкова Ольга",
  "Виктор Чумаков",
  "Гущина Валерия",
  "Наиль Якубалиев",
];

const DEPARTMENT_ROWS = ["Спорт", "КК", "ВК"];
const BASE_ROWS = [...TEAM_MEMBERS, ...DEPARTMENT_ROWS];

const TEAM_DEPT_ID = "team";
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
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const teamEntries = useMemo(() => (data ?? []).filter((e) => e.department_id === TEAM_DEPT_ID), [data]);

  const employees = useMemo(() => {
    const base = new Set(BASE_ROWS);
    const custom = teamEntries.map((e) => e.employee).filter((name) => !base.has(name));
    return [...BASE_ROWS, ...Array.from(new Set(custom)).sort()];
  }, [teamEntries]);

  const grid = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const name of employees) map[name] = {};
    for (const entry of teamEntries) {
      if (!map[entry.employee]) map[entry.employee] = {};
      map[entry.employee][entry.week] = entry.value;
    }
    return map;
  }, [employees, teamEntries]);

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
      await upsertMorale(TEAM_DEPT_ID, employee, week, value);
      reload();
    } finally {
      setSavingCell(null);
    }
  }

  async function addEmployee() {
    const name = window.prompt("Имя сотрудника:")?.trim();
    if (!name) return;
    await upsertMorale(TEAM_DEPT_ID, name, WEEKS[WEEKS.length - 1], null);
    reload();
  }

  return (
    <div>
      <div className="metrics-bar">
        <Metric label="Участников" value={employees.length} />
        <Metric label="Цель" value={`≥ ${TARGET}`} />
        <Metric label="Последняя неделя" value={latest?.week ?? "—"} />
        <Metric label="Среднее" value={latest?.value === null || latest?.value === undefined ? "—" : latest.value.toFixed(2)} />
      </div>

      <div className="morale-grid">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 6px 8px" }}>
          Команда управления ДККиУР и отделы. Клик по ячейке — балл 0-5.
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
                  Строк пока нет. Нажмите «+ Добавить сотрудника».
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
        <button className="add-row" onClick={addEmployee}>
          + Добавить сотрудника
        </button>
      </div>

      <div className="card">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px" }}>
          Динамика среднего
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-mini">
      <p className="l">{label}</p>
      <p className="v">{value}</p>
    </div>
  );
}
