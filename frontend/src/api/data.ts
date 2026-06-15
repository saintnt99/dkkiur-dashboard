import { useEffect, useState } from "react";
import type { Climate, Department, EventItem, Meeting, MoraleEntry, QualityMetric, Summary } from "../types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function useFetch<T>(url: string, deps: unknown[] = []): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getJSON<T>(url)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);
  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}

export const useDepartments = () => useFetch<Department[]>("/api/departments");
export const useQuality = () => useFetch<QualityMetric[]>("/api/quality");
export const useEvents = () => useFetch<EventItem[]>("/api/events");
export const useMorale = () => useFetch<Climate[]>("/api/morale");
export const useMoraleEntries = () => useFetch<MoraleEntry[]>("/api/morale_entries");
export const useMeetings = () => useFetch<Meeting[]>("/api/meetings");
export const useSummary = () => useFetch<Summary>("/api/summary");

async function patchJSON(url: string, body: unknown, method: "PATCH" | "PUT" = "PATCH"): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type PatchValue = string | number | boolean | null;

export const patchQuality = (id: string, field: string, value: PatchValue) =>
  patchJSON(`/api/quality/${id}`, { field, value });
export const patchEvent2 = (id: string, field: string, value: PatchValue) =>
  patchJSON(`/api/events/${id}`, { field, value });
export const patchMeeting = (id: string, field: string, value: PatchValue) =>
  patchJSON(`/api/meetings/${id}`, { field, value });
export const upsertMorale = (department_id: string, employee: string, week: string, value: number | null) =>
  patchJSON(`/api/morale_entries`, { department_id, employee, week, value }, "PUT");

export async function uploadDepartmentXlsx(dept: string, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/import/department/${dept}`, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadMeetingsXlsx(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/import/meetings", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bootstrap(): Promise<unknown> {
  const res = await fetch("/api/import/bootstrap", { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function patchEvent(id: string, field: string, value: string | number | boolean | null): Promise<unknown> {
  const res = await fetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ field, value }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
