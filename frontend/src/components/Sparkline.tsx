type Point = { fact: number | null; target: number | null };

export function Sparkline({ points, width = 220, height = 32 }: { points: Point[]; width?: number; height?: number }) {
  const facts = points.map((p) => p.fact).filter((v): v is number => v !== null);
  if (facts.length < 2) return <div style={{ height, color: "var(--text-3)", fontSize: 11 }}>— нет ряда —</div>;
  const target = points.find((p) => p.target !== null)?.target ?? null;
  const min = Math.min(...facts, target ?? facts[0]);
  const max = Math.max(...facts, target ?? facts[0]);
  const range = max - min || 1;
  const stepX = width / Math.max(facts.length - 1, 1);
  const y = (v: number) => height - ((v - min) / range) * (height - 4) - 2;
  const path = facts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className="kpi-spark">
      {target !== null && (
        <line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke="var(--text-3)" strokeDasharray="3 3" strokeWidth={1} />
      )}
      <path d={path} fill="none" stroke="var(--kpi-bar)" strokeWidth={1.5} />
    </svg>
  );
}
