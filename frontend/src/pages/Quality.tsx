import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineEdit } from "../components/InlineEdit";
import { Sparkline } from "../components/Sparkline";
import { UploadButton } from "../components/UploadButton";
import { patchQuality, uploadDepartmentXlsx, useQuality } from "../api/data";
import type { QualityMetric } from "../types";

const DEPTS: { id: string; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

function statusLight(m: QualityMetric): "green" | "red" | "amber" | "grey" {
  if (m.progress === null) return "grey";
  if (m.progress >= 1) return "green";
  if (m.progress >= 0.7) return "amber";
  return "red";
}


export default function Quality() {
  const { data, loading, error, reload } = useQuality();
  const [dept, setDept] = useState("all");
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(() => (data ?? []).filter((m) => dept === "all" || m.department_id === dept), [data, dept]);
  const activeMetric = useMemo(() => filtered.find((m) => m.id === active) ?? null, [filtered, active]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;
  if (error) return <div className="card placeholder">Ошибка: {error}</div>;

  return (
    <div>
      <div className="import-bar">
        <UploadButton
          label="Загрузить xlsx (Спорт)"
          onPick={async (f) => {
            await uploadDepartmentXlsx("sport", f);
            reload();
          }}
        />
        <UploadButton
          label="Загрузить xlsx (КК)"
          onPick={async (f) => {
            await uploadDepartmentXlsx("culture", f);
            reload();
          }}
        />
        <UploadButton
          label="Загрузить xlsx (ВК)"
          onPick={async (f) => {
            await uploadDepartmentXlsx("communications", f);
            reload();
          }}
        />
      </div>

      <div className="filters">
        {DEPTS.map((d) => (
          <button key={d.id} className={`filter-chip${dept === d.id ? " active" : ""}`} onClick={() => setDept(d.id)}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        {filtered.map((m) => (
          <div key={m.id} className={`kpi-card${active === m.id ? " active" : ""}`}>
            <div className="kpi-dept" onClick={() => setActive(active === m.id ? null : m.id)} style={{ cursor: "pointer" }}>
              {m.department} · <span className={`kpi-light ${statusLight(m)}`} /> {m.status}
            </div>
            <p className="kpi-title">
              <InlineEdit kind="text" multiline value={m.title} onSave={async (v) => { await patchQuality(m.id, "title", v); reload(); }} />
            </p>
            <div className="kpi-row">
              <span className="kpi-fact">
                <InlineEdit
                  kind="number"
                  value={m.latest_fact}
                  onSave={async (v) => {
                    await patchQuality(m.id, "latest_fact", v);
                    if (v !== null && m.latest_target) await patchQuality(m.id, "progress", v / m.latest_target);
                    reload();
                  }}
                />
              </span>
              <span className="kpi-target">
                из{" "}
                <InlineEdit
                  kind="number"
                  value={m.latest_target}
                  onSave={async (v) => {
                    await patchQuality(m.id, "latest_target", v);
                    if (v && m.latest_fact !== null) await patchQuality(m.id, "progress", m.latest_fact / v);
                    reload();
                  }}
                />
              </span>
            </div>
            <div onClick={() => setActive(active === m.id ? null : m.id)} style={{ cursor: "pointer" }}>
              <Sparkline points={m.series} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="card placeholder">Нет показателей для фильтра</div>}
      </div>

      {activeMetric && <Detail metric={activeMetric} onClose={() => setActive(null)} />}
    </div>
  );
}

function Detail({ metric, onClose }: { metric: QualityMetric; onClose: () => void }) {
  const data = metric.series.map((p) => ({ period: p.period, fact: p.fact, target: p.target }));
  const target = metric.series.find((p) => p.target !== null)?.target ?? undefined;
  return (
    <div className="kpi-detail">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2>{metric.title}</h2>
          <p className="sub">
            {metric.department} · {metric.fact_label || "Факт"} / {metric.target_label || "Цель"}
          </p>
        </div>
        <button className="upload-btn" onClick={onClose}>
          закрыть
        </button>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text-2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-2)" }} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            {target !== undefined && <ReferenceLine y={target} stroke="var(--text-3)" strokeDasharray="3 3" label={{ value: "Цель", fill: "var(--text-3)", fontSize: 11 }} />}
            <Line type="monotone" dataKey="fact" stroke="var(--kpi-bar)" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <dl className="kpi-meta">
        {metric.goal && (
          <>
            <dt>Цель</dt>
            <dd>{metric.goal}</dd>
          </>
        )}
        {metric.periodicity && (
          <>
            <dt>Периодичность</dt>
            <dd>{metric.periodicity}</dd>
          </>
        )}
        {metric.owner && (
          <>
            <dt>Ответственные</dt>
            <dd>{metric.owner}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
