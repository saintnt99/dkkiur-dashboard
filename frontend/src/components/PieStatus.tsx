import { useEffect, useRef, useState } from "react";

const STAGES = [
  { code: 0, title: "Не задан", fill: 0 },
  { code: 1, title: "Контрмеры определены (1)", fill: 0.25 },
  { code: 2, title: "Ответственный определён (2)", fill: 0.5 },
  { code: 3, title: "Контрмеры в работе (3)", fill: 0.75 },
  { code: 4, title: "Вопрос закрыт (4)", fill: 1 },
];

export function PieIcon({ fill, size = 22 }: { fill: number; size?: number }) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  if (fill <= 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--text-3)" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (fill >= 1) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="var(--text)" />
      </svg>
    );
  }
  const angle = fill * 2 * Math.PI - Math.PI / 2;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = fill > 0.5 ? 1 : 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--text)" />
      <path d={`M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${large} 1 ${x},${y} Z`} fill="var(--text)" />
    </svg>
  );
}

export function PieStatus({ value, onChange }: { value: number; onChange: (v: number) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const stage = STAGES.find((s) => s.code === value) ?? STAGES[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div className="pie-status" onClick={() => setOpen((v) => !v)} title={stage.title}>
        <PieIcon fill={stage.fill} />
        <span className="label">{value || "—"}</span>
      </div>
      {open && (
        <div className="pie-popover">
          {STAGES.map((s) => (
            <div
              key={s.code}
              className="pie-status"
              style={{ cursor: "pointer", padding: 4 }}
              title={s.title}
              onClick={async () => {
                setOpen(false);
                if (s.code !== value) await onChange(s.code);
              }}
            >
              <PieIcon fill={s.fill} />
              <span className="label">{s.code || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
