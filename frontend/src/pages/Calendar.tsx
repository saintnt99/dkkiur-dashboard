import { useMemo } from "react";
import { UploadButton } from "../components/UploadButton";
import { uploadMeetingsXlsx, useMeetings } from "../api/data";
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
          {grouped[day].map((m) => (
            <div key={m.id} className="meeting-row">
              <span className="time">{m.time || "—"}</span>
              <div>
                <div className="title">{m.department}</div>
                <div className="meta">
                  {m.type}
                  {m.level ? ` · ур. ${m.level}` : ""} · {m.leader}
                  {m.place ? ` · ${m.place}` : ""}
                  {m.format ? ` · ${m.format}` : ""}
                </div>
              </div>
              {m.leader_phone && (
                <span className="meta" style={{ whiteSpace: "nowrap" }}>
                  <a href={`tel:+${m.leader_phone}`}>+{m.leader_phone}</a>
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
      {Object.keys(grouped).length === 0 && <div className="card placeholder">Календарь пуст</div>}
    </div>
  );
}
