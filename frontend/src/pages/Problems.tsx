import { useMemo, useState } from "react";
import { InlineEdit } from "../components/InlineEdit";
import { PieStatus } from "../components/PieStatus";
import { createMeasure, deleteMeasure, patchMeasure, useMeasures } from "../api/data";
import type { Measure } from "../types";

const DEPTS: { id: string | null; label: string }[] = [
  { id: null, label: "Все" },
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

const DEPT_OPTIONS = [
  { value: "", label: "—" },
  { value: "sport", label: "Спорт" },
  { value: "culture", label: "КК" },
  { value: "communications", label: "ВК" },
];

export default function Problems() {
  const { data, loading, reload } = useMeasures();
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return (data ?? []).filter((m) => filterDept === null || m.department_id === filterDept);
  }, [data, filterDept]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  const patch = async (id: number, field: string, value: string | number) => {
    await patchMeasure(id, field, value);
    reload();
  };

  const addRow = async () => {
    setBusy(true);
    try {
      await createMeasure(filterDept);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const removeRow = async (m: Measure) => {
    if (!window.confirm(`Удалить строку «${m.task || "без названия"}»?`)) return;
    await deleteMeasure(m.id);
    reload();
  };

  const deptLabel = (id: string | null) => DEPT_OPTIONS.find((o) => o.value === id)?.label ?? "—";

  return (
    <div>
      <div className="filters">
        {DEPTS.map((d) => (
          <button
            key={String(d.id)}
            className={`filter-chip${filterDept === d.id ? " active" : ""}`}
            onClick={() => setFilterDept(d.id)}
          >
            {d.label}
          </button>
        ))}
        <span className="filter-note">
          {filtered.length} из {data?.length ?? 0}
        </span>
        <button className="add-row" style={{ marginTop: 0 }} onClick={addRow} disabled={busy}>
          + Добавить строку
        </button>
      </div>

      <div className="measures-table-wrap">
        <table className="measures-table">
          <thead>
            <tr>
              <th className="col-num">№</th>
              <th className="col-dept">Отдел</th>
              <th className="col-task">Задача / блок</th>
              <th className="col-week">Неделя</th>
              <th className="col-actor">Инициатор</th>
              <th className="col-text">Отклонение. Что? Влияние?</th>
              <th className="col-text">Первопричина</th>
              <th className="col-text">Контрмера</th>
              <th className="col-actor">Ответственный</th>
              <th className="col-week">Срок (нед.)</th>
              <th className="col-pie">Статус</th>
              <th className="col-close">Подтверждение закрытия</th>
              <th className="col-del" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={13} className="placeholder" style={{ padding: "32px 16px" }}>
                  Пока нет ни одной строки. Нажмите «+ Добавить строку».
                </td>
              </tr>
            )}
            {filtered.map((m, i) => (
              <tr key={m.id}>
                <td className="col-num">{i + 1}</td>
                <td className="col-dept">
                  <InlineEdit
                    kind="select"
                    value={m.department_id ?? ""}
                    options={DEPT_OPTIONS}
                    onSave={(v) => patch(m.id, "department_id", v || "")}
                  />
                  <noscript>{deptLabel(m.department_id)}</noscript>
                </td>
                <td className="col-task">
                  <InlineEdit kind="text" multiline value={m.task} onSave={(v) => patch(m.id, "task", v)} placeholder="задача / блок" />
                </td>
                <td className="col-week">
                  <InlineEdit kind="text" value={m.week} onSave={(v) => patch(m.id, "week", v)} placeholder="—" />
                </td>
                <td className="col-actor">
                  <InlineEdit kind="text" value={m.initiator} onSave={(v) => patch(m.id, "initiator", v)} placeholder="инициатор" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={m.deviation} onSave={(v) => patch(m.id, "deviation", v)} placeholder="что? влияние?" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={m.root_cause} onSave={(v) => patch(m.id, "root_cause", v)} placeholder="первопричина" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={m.countermeasure} onSave={(v) => patch(m.id, "countermeasure", v)} placeholder="контрмера" />
                </td>
                <td className="col-actor">
                  <InlineEdit kind="text" value={m.responsible} onSave={(v) => patch(m.id, "responsible", v)} placeholder="ответственный" />
                </td>
                <td className="col-week">
                  <InlineEdit kind="text" value={m.term_weeks} onSave={(v) => patch(m.id, "term_weeks", v)} placeholder="—" />
                </td>
                <td className="col-pie">
                  <PieStatus value={m.status_code} onChange={(v) => patch(m.id, "status_code", v)} />
                </td>
                <td className="col-close">
                  <InlineEdit kind="text" multiline value={m.closure_confirm} onSave={(v) => patch(m.id, "closure_confirm", v)} placeholder="как закрыто" />
                </td>
                <td className="col-del">
                  <button className="row-del" title="Удалить строку" onClick={() => removeRow(m)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12 }}>
        Это отдельный журнал отклонений, не связан с вкладкой «События». Клик по ячейке — редактировать. Enter — сохранить.
      </p>
    </div>
  );
}
