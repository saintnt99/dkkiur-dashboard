import { useCallback, useEffect, useState } from "react";

export type Identity = string | null;

export async function login(password: string, introduce?: string): Promise<string> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password, introduce }),
  });
  if (!res.ok) throw new Error("login failed");
  const data = (await res.json()) as { identity: string };
  return data.identity;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function fetchMe(): Promise<Identity> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("me failed");
  const data = (await res.json()) as { identity: string };
  return data.identity;
}

export function useAuth(): { identity: Identity; loading: boolean; refresh: () => void } {
  const [identity, setIdentity] = useState<Identity>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchMe()
      .then((id) => setIdentity(id))
      .catch(() => setIdentity(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { identity, loading, refresh };
}
