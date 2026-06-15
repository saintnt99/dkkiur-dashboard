import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineEdit } from "../components/InlineEdit";
import { StatusPill } from "../components/StatusPill";
import { createEvent, deleteEvent, patchEvent2, useEvents, useSummary } from "../api/data";
import type { EventItem } from "../types";

const DEPTS = [
  { id: "all", label: "Все" },
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

const STATUS = ["Все", "В работе", "Проблема", "Запланировано", "Приостановлено", "Завершено"];

function rowClass(e: EventItem): string {
  if (e.is_problem) return "problem";
  if (e.is_done) return "done";
  if (e.traffic === "1") return "warn";
  return "";
}

function statusPill(e: EventItem): { label: string; cls: string } {
  if (e.is_problem) return { label: e.status || "Проблема", cls: "danger" };
  if (e.is_done) return { label: "Завершено", cls: "success" };
  if (e.traffic === "1") return { label: e.status, cls: "warn" };
  if (e.status) return { label: e.status, cls: "neutral" };
  return { label: "—", cls: "neutral" };
}

const PRIORITY_OPTIONS = [
  { value: "", label: "—" },
  { value: "Высокий", label: "Высокий" },
  { value: "Средний", label: "Средний" },
  { value: "Низкий", label: "Низкий" },
];

export default function Events() {
  const { data: events, loading, reload } = useEvents();
  const { data: summary } = useSummary();
  const [dept, setDept] = useState("all");
  const [statusF, setStatusF] = useState("Все");
  const [hpOnly, setHpOnly] = useState(false);

  const filtered = useMemo(() => {
    return (events ?? []).filter((e) => {
      if (dept !== "all" && e.department_id !== dept) return false;
      if (statusF !== "Все" && e.status !== statusF) return false;
      if (hpOnly && !e.is_high_priority) return false;
      return true;
    });
  }, [events, dept, statusF, hpOnly]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  const overallChart = summary
    ? [
        { name: "Всего", value: summary.events_total, done: summary.events_done },
        { name: "Высокий приоритет", value: summary.high_priority_total, done: summary.high_priority_done },
      ]
    : [];

  return (
    <div>
      <div className="metrics-bar">
        <Metric label="Всего событий" value={summary?.events_total ?? "—"} />
        <Metric label="Завершено" value={summary ? `${summary.events_done}/${summary.events_total}` : "—"} />
        <Metric label="Высокий приоритет" value={summary ? `${summary.high_priority_done}/${summary.high_priority_total}` : "—"} />
        <Metric label="Проблемных" value={summary?.problem_total ?? "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
        <ChartBlock title="Выполнение мероприятий" data={overallChart.slice(0, 1)} />
        <ChartBlock title="Высокий приоритет" data={overallChart.slice(1, 2)} />
      </div>

      <div className="filters">
        {DEPTS.map((d) => (
          <button key={d.id} className={`filter-chip${dept === d.id ? " active" : ""}`} onClick={() => setDept(d.id)}>
            {d.label}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: "var(--border)" }} />
        {STATUS.map((s) => (
          <button key={s} className={`filter-chip${statusF === s ? " active" : ""}`} onClick={() => setStatusF(s)}>
            {s}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: "var(--border)" }} />
        <button className={`filter-chip${hpOnly ? " active" : ""}`} onClick={() => setHpOnly((v) => !v)}>
          Только высокий
        </button>
        <button
          className="add-row"
          style={{ marginTop: 0, marginLeft: "auto" }}
          onClick={async () => {
            const targetDept = dept === "all" ? "sport" : dept;
            await createEvent(targetDept, "Новое событие");
            reload();
          }}
        >
          + Создать событие
        </button>
      </div>

      <div className="events-table-wrap card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="events-table">
          <thead>
            <tr>
              <th>Отдел</th>
              <th>№</th>
              <th>Мероприятие</th>
              <th>Приоритет</th>
              <th>Ответ.</th>
              <th>Куратор</th>
              <th>Дедлайн</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const patch = async (field: string, value: string) => {
                await patchEvent2(e.id, field, value);
                reload();
              };
              const remove = async () => {
                if (!window.confirm(`Удалить «${e.name}»?`)) return;
                await deleteEvent(e.id);
                reload();
              };
              return (
                <tr key={e.id} className={rowClass(e)}>
                  <td className="nw">{e.department}</td>
                  <td className="nw">
                    <InlineEdit kind="text" value={e.number} onSave={(v) => patch("number", v)} />
                  </td>
                  <td>
                    <InlineEdit kind="text" multiline value={e.name} onSave={(v) => patch("name", v)} />
                  </td>
                  <td className="nw">
                    <InlineEdit kind="select" value={e.priority} options={PRIORITY_OPTIONS} onSave={(v) => patch("priority", v)} />
                  </td>
                  <td className="nw">
                    <InlineEdit kind="text" value={e.owner} onSave={(v) => patch("owner", v)} />
                  </td>
                  <td className="nw">
                    <InlineEdit kind="text" value={e.curator} onSave={(v) => patch("curator", v)} />
                  </td>
                  <td className="nw">
                    <InlineEdit kind="text" value={e.deadline} onSave={(v) => patch("deadline", v)} />
                  </td>
                  <td className="nw">
                    <StatusPill value={e.status} onChange={(v) => patch("status", v)} />
                  </td>
                  <td className="nw">
                    <button className="row-del" title="Удалить" onClick={remove}>×</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="placeholder">
                  Нет событий
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="events-mobile">
        {filtered.map((e) => {
          const p = statusPill(e);
          return (
            <div key={e.id} className="event-card">
              <div className="top">
                <span className="meta">
                  {e.department} · №{e.number}
                </span>
                <span className={`pill ${p.cls}`}>{p.label}</span>
              </div>
              <div className="name">{e.name}</div>
              <div className="meta">
                {e.priority} · {e.owner} · до {e.deadline || "—"}
              </div>
            </div>
          );
        })}
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

function ChartBlock({ title, data }: { title: string; data: { name: string; value: number; done: number }[] }) {
  return (
    <div className="card">
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px" }}>{title}</p>
      <div style={{ height: 140 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-2)" }} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="var(--neutral-bg)" stroke="var(--border-2)" />
            <Bar dataKey="done" fill="var(--benefits-bar)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
