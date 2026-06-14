import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMorale } from "../api/data";

const DEPTS = [
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

function heatColor(v: number | null, target: number): string {
  if (v === null) return "var(--surface-2)";
  if (v >= target) return "var(--success-bg)";
  if (v >= target - 1) return "var(--warn-bg)";
  return "var(--danger-bg)";
}

export default function Morale() {
  const { data, loading } = useMorale();
  const [dept, setDept] = useState("sport");
  const current = useMemo(() => data?.find((c) => c.department_id === dept), [data, dept]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  return (
    <div>
      <div className="filters">
        {DEPTS.map((d) => (
          <button key={d.id} className={`filter-chip${dept === d.id ? " active" : ""}`} onClick={() => setDept(d.id)}>
            {d.label}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="card placeholder">Нет данных по отделу</div>
      ) : (
        <>
          <div className="metrics-bar">
            <Metric label="Сотрудников" value={current.employee_count} />
            <Metric label="Цель" value={`≥ ${current.target}`} />
            <Metric label="Последняя неделя" value={current.latest_week || "—"} />
            <Metric label="Последнее значение" value={current.latest_value === null ? "—" : current.latest_value.toFixed(2)} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 4px" }}>{current.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 10px" }}>{current.question}</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={current.series.map((p) => ({ ...p }))} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-2)" }} />
                  <YAxis domain={[0, "dataMax + 1"]} tick={{ fontSize: 11, fill: "var(--text-2)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={current.target} stroke="var(--danger-fg)" strokeDasharray="3 3" label={{ value: "Цель", fill: "var(--danger-fg)", fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" stroke="var(--benefits-bar)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card heatmap">
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px" }}>Сводка по неделям</p>
            <table>
              <thead>
                <tr>
                  <th className="sticky">Метрика</th>
                  {current.series.map((p) => (
                    <th key={p.week}>{p.week}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky">Среднее</td>
                  {current.series.map((p) => (
                    <td key={p.week} style={{ background: heatColor(p.value, current.target) }}>
                      {p.value === null ? "—" : p.value.toFixed(1)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky">Ответов</td>
                  {current.series.map((p) => (
                    <td key={p.week}>{p.count}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
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
