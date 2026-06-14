import { FormEvent, useState } from "react";
import { login } from "../api/auth";

export default function Login() {
  const [password, setPassword] = useState("");
  const [introduce, setIntroduce] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(password, introduce.trim() || undefined);
      window.location.replace("/");
    } catch {
      setError("Неверный пароль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h1 style={{ fontWeight: 500 }}>Вход</h1>
      <p className="sub">Общий пароль выдаёт администратор. Имя — для журнала правок.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <input
          autoFocus
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Как вас представить? (необязательно)"
          value={introduce}
          onChange={(e) => setIntroduce(e.target.value)}
          style={inputStyle}
        />
        {error && <div style={{ color: "var(--danger-fg)", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={busy || !password} style={btnStyle}>
          {busy ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "0.5px solid var(--border-2)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "none",
  borderRadius: 8,
  background: "var(--text)",
  color: "var(--bg)",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
