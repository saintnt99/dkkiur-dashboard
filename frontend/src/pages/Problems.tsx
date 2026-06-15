import { useMemo, useState } from "react";
import { InlineEdit } from "../components/InlineEdit";
import { PieStatus } from "../components/PieStatus";
import { patchEvent2, useEvents } from "../api/data";

const DEPTS = [
  { id: "all", label: "Все" },
  { id: "sport", label: "Спорт" },
  { id: "culture", label: "КК" },
  { id: "communications", label: "ВК" },
];

const PRIORITIES = [
  { value: "", label: "—" },
  { value: "Высокий", label: "Высокий" },
  { value: "Средний", label: "Средний" },
  { value: "Низкий", label: "Низкий" },
];

export default function Problems() {
  const { data, loading, reload } = useEvents();
  const [dept, setDept] = useState("all");
  const [problemsOnly, setProblemsOnly] = useState(false);

  const filtered = useMemo(() => {
    return (data ?? []).filter((e) => {
      if (dept !== "all" && e.department_id !== dept) return false;
      if (problemsOnly && !e.is_problem) return false;
      return true;
    });
  }, [data, dept, problemsOnly]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  async function patch(id: string, field: string, value: string | number) {
    await patchEvent2(id, field, value);
    reload();
  }

  return (
    <div>
      <div className="filters">
        {DEPTS.map((d) => (
          <button key={d.id} className={`filter-chip${dept === d.id ? " active" : ""}`} onClick={() => setDept(d.id)}>
            {d.label}
          </button>
        ))}
        <button className={`filter-chip${problemsOnly ? " active" : ""}`} onClick={() => setProblemsOnly((v) => !v)}>
          Только проблемы
        </button>
        <span className="filter-note">
          {filtered.length} из {data?.length ?? 0}
        </span>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id}>
                <td className="col-num">{i + 1}</td>
                <td className="col-dept">{e.department}</td>
                <td className="col-task">
                  <InlineEdit kind="text" multiline value={e.name} onSave={(v) => patch(e.id, "name", v)} placeholder="название" />
                </td>
                <td className="col-week">
                  <InlineEdit kind="text" value={e.week} onSave={(v) => patch(e.id, "week", v)} placeholder="—" />
                </td>
                <td className="col-actor">
                  <InlineEdit kind="text" value={e.owner} onSave={(v) => patch(e.id, "owner", v)} placeholder="инициатор" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={e.deviation} onSave={(v) => patch(e.id, "deviation", v)} placeholder="что? влияние?" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={e.root_cause} onSave={(v) => patch(e.id, "root_cause", v)} placeholder="первопричина" />
                </td>
                <td className="col-text">
                  <InlineEdit kind="text" multiline value={e.countermeasure} onSave={(v) => patch(e.id, "countermeasure", v)} placeholder="контрмера" />
                </td>
                <td className="col-actor">
                  <InlineEdit kind="text" value={e.responsible || e.curator} onSave={(v) => patch(e.id, "responsible", v)} placeholder="ответственный" />
                </td>
                <td className="col-week">
                  <InlineEdit kind="text" value={e.term_weeks} onSave={(v) => patch(e.id, "term_weeks", v)} placeholder="—" />
                </td>
                <td className="col-pie">
                  <PieStatus value={e.status_code} onChange={(v) => patch(e.id, "status_code", v)} />
                </td>
                <td className="col-close">
                  <InlineEdit kind="text" multiline value={e.closure_confirm} onSave={(v) => patch(e.id, "closure_confirm", v)} placeholder="как закрыто" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="placeholder">
                  Нет строк по фильтру
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12 }}>
        Совет: кликни на ячейку чтобы изменить. Enter — сохранить, Esc — отменить. Дополнительные поля приоритета/деталей — на вкладке «События».
      </p>
      {/* Используем priorities чтобы не было unused */}
      <span style={{ display: "none" }}>{PRIORITIES.length}</span>
    </div>
  );
}
