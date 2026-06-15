import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineEdit } from "../components/InlineEdit";
import { upsertMorale, useMoraleEntries } from "../api/data";

// Закреплённая команда управления ДККиУР
const PARTICIPANTS = [
  { name: "Камнева Евгения", department_id: "culture" },
  { name: "Серкова Ольга", department_id: "culture" },
  { name: "Виктор Чумаков", department_id: "communications" },
  { name: "Гущина Валерия", department_id: "communications" },
  { name: "Наиль Якубалиев", department_id: "sport" },
];

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
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // employee → week → value
  const grid = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const p of PARTICIPANTS) map[p.name] = {};
    for (const entry of data ?? []) {
      if (!map[entry.employee]) map[entry.employee] = {};
      map[entry.employee][entry.week] = entry.value;
    }
    return map;
  }, [data]);

  const series = useMemo(() => {
    return WEEKS.map((week) => {
      const values = PARTICIPANTS.map((p) => grid[p.name]?.[week]).filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
      return { week, value: avg, count: values.length };
    });
  }, [grid]);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) if (series[i].value !== null) return series[i];
    return null;
  }, [series]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  async function save(employee: string, dept: string, week: string, value: number | null) {
    setSavingCell(`${employee}|${week}`);
    try {
      await upsertMorale(dept, employee, week, value);
      reload();
    } finally {
      setSavingCell(null);
    }
  }

  return (
    <div>
      <div className="metrics-bar">
        <Metric label="Участников" value={PARTICIPANTS.length} />
        <Metric label="Цель" value={`≥ ${TARGET}`} />
        <Metric label="Последняя неделя" value={latest?.week ?? "—"} />
        <Metric label="Среднее по команде" value={latest?.value === null || latest?.value === undefined ? "—" : latest.value.toFixed(2)} />
      </div>

      <div className="morale-grid">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 6px 8px" }}>
          Сводка по неделям. Кликните на ячейку чтобы внести балл (0-5). Пусто = ещё не оценено.
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
            {PARTICIPANTS.map((p) => (
              <tr key={p.name}>
                <td className="sticky">{p.name}</td>
                {WEEKS.map((w) => {
                  const v = grid[p.name]?.[w] ?? null;
                  const key = `${p.name}|${w}`;
                  return (
                    <td key={w} style={{ background: heatColor(v), opacity: savingCell === key ? 0.5 : 1 }}>
                      <InlineEdit
                        kind="number"
                        value={v}
                        onSave={(val) => save(p.name, p.department_id, w, val)}
                        placeholder="—"
                      />
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
      </div>

      <div className="card">
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px" }}>Динамика среднего по команде</p>
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
