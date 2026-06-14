import { useMemo } from "react";
import { useEvents } from "../api/data";

const LEGEND = [
  { title: "Контрмеры определены (1)", fill: 0.25 },
  { title: "Ответственный определён (2)", fill: 0.5 },
  { title: "Контрмеры в работе (3)", fill: 0.75 },
  { title: "Вопрос закрыт (4)", fill: 1 },
];

function PieIcon({ fill }: { fill: number }) {
  const r = 11;
  const cx = 13;
  const cy = 13;
  const angle = fill * 2 * Math.PI - Math.PI / 2;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = fill > 0.5 ? 1 : 0;
  const path = fill >= 0.999 ? null : `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${large} 1 ${x},${y} Z`;
  return (
    <svg width={26} height={26} viewBox="0 0 26 26" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--text)" />
      {fill >= 0.999 ? <circle cx={cx} cy={cy} r={r} fill="var(--text)" /> : path && <path d={path} fill="var(--text)" />}
    </svg>
  );
}

export default function Problems() {
  const { data, loading } = useEvents();
  const problems = useMemo(() => (data ?? []).filter((e) => e.is_problem), [data]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 10px" }}>Условные обозначения</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          {LEGEND.map((l) => (
            <div key={l.title} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <PieIcon fill={l.fill} />
              {l.title}
            </div>
          ))}
        </div>
      </div>

      <div className="problems-grid">
        {problems.map((e) => (
          <div key={e.id} className="problem-card">
            <h3>
              {e.name} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· {e.department}</span>
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
              {e.priority} · до {e.deadline || "—"}
            </div>
            <dl>
              <dt>Ответственный</dt>
              <dd>{e.owner || "—"}</dd>
              <dt>Куратор</dt>
              <dd>{e.curator || "—"}</dd>
              <dt>Статус</dt>
              <dd>
                {e.status}
                {e.traffic_label ? ` · ${e.traffic_label}` : ""}
              </dd>
              {e.notes && (
                <>
                  <dt>Комментарий</dt>
                  <dd>{e.notes}</dd>
                </>
              )}
            </dl>
          </div>
        ))}
        {problems.length === 0 && <div className="card placeholder">Проблемных мероприятий нет 🎉</div>}
      </div>
    </div>
  );
}
