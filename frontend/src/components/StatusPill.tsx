import { useEffect, useRef, useState } from "react";

const STATUSES: { value: string; label: string; cls: string }[] = [
  { value: "", label: "—", cls: "neutral" },
  { value: "В работе", label: "В работе", cls: "news" },
  { value: "Проблема", label: "Проблема", cls: "danger" },
  { value: "Запланировано", label: "Запланировано", cls: "neutral" },
  { value: "Приостановлено", label: "Приостановлено", cls: "warn" },
  { value: "Завершено", label: "Завершено", cls: "success" },
];

export function StatusPill({ value, onChange }: { value: string; onChange: (v: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUSES.find((s) => s.value === value) ?? STATUSES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span className={`pill ${current.cls}`} style={{ cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        {current.label}
      </span>
      {open && (
        <div className="pie-popover" style={{ flexDirection: "column", alignItems: "stretch", minWidth: 160 }}>
          {STATUSES.map((s) => (
            <span
              key={s.value}
              className={`pill ${s.cls}`}
              style={{ cursor: "pointer", marginBottom: 2, textAlign: "center" }}
              onClick={async () => {
                setOpen(false);
                if (s.value !== value) await onChange(s.value);
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
