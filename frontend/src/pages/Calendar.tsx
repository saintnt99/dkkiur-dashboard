import { useMemo } from "react";
import { InlineEdit } from "../components/InlineEdit";
import { UploadButton } from "../components/UploadButton";
import { patchMeeting, uploadMeetingsXlsx, useMeetings } from "../api/data";
import type { Meeting } from "../types";

const DAY_ORDER = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

export default function Calendar() {
  const { data, loading, reload } = useMeetings();

  const grouped = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of data ?? []) {
      (map[m.day] ??= []).push(m);
    }
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [data]);

  if (loading) return <div className="card placeholder">Загрузка…</div>;

  return (
    <div>
      <div className="import-bar">
        <UploadButton
          label="Загрузить календарь совещаний (xlsx)"
          onPick={async (f) => {
            await uploadMeetingsXlsx(f);
            reload();
          }}
        />
      </div>
      {DAY_ORDER.filter((d) => grouped[d]?.length).map((day) => (
        <div key={day} className="calendar-day">
          <h3>{day}</h3>
          {grouped[day].map((m) => {
            const patch = async (field: string, value: string) => {
              await patchMeeting(m.id, field, value);
              reload();
            };
            return (
              <div key={m.id} className="meeting-row">
                <span className="time">
                  <InlineEdit kind="text" value={m.time} onSave={(v) => patch("time", v)} placeholder="время" />
                </span>
                <div>
                  <div className="title">
                    <InlineEdit kind="text" value={m.department} onSave={(v) => patch("department", v)} placeholder="отдел" />
                  </div>
                  <div className="meta">
                    <InlineEdit kind="text" value={m.type} onSave={(v) => patch("type", v)} placeholder="тип" />
                    {" · "}
                    <InlineEdit kind="text" value={m.leader} onSave={(v) => patch("leader", v)} placeholder="ведущий" />
                    {" · "}
                    <InlineEdit kind="text" value={m.place} onSave={(v) => patch("place", v)} placeholder="место" />
                    {" · "}
                    <InlineEdit kind="text" value={m.format} onSave={(v) => patch("format", v)} placeholder="формат" />
                  </div>
                </div>
                <span className="meta" style={{ whiteSpace: "nowrap" }}>
                  <InlineEdit kind="text" value={m.leader_phone} onSave={(v) => patch("leader_phone", v)} placeholder="тел." />
                </span>
              </div>
            );
          })}
        </div>
      ))}
      {Object.keys(grouped).length === 0 && <div className="card placeholder">Календарь пуст</div>}
    </div>
  );
}
