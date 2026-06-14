import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Quality from "./pages/Quality";
import Events from "./pages/Events";
import Morale from "./pages/Morale";
import Problems from "./pages/Problems";
import Calendar from "./pages/Calendar";
import { useAuth } from "./api/auth";

const TABS = [
  { to: "/quality", label: "Качество" },
  { to: "/events", label: "События" },
  { to: "/morale", label: "Моральный климат" },
  { to: "/problems", label: "Проблемные" },
  { to: "/calendar", label: "Календарь" },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("dkkiur.theme") as "light" | "dark") || "light"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dkkiur.theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { identity, loading } = useAuth();

  if (loading) return <div className="wrap placeholder">Загрузка…</div>;
  if (!identity) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>ДККиУР — Дашборд</h1>
          <p className="sub">{identity}</p>
        </div>
        <button className="theme-toggle" onClick={toggle}>
          {theme === "light" ? "🌙" : "☀"}
        </button>
      </header>
      <nav className="tabs">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/quality" replace />} />
        <Route path="/quality" element={<Quality />} />
        <Route path="/events" element={<Events />} />
        <Route path="/morale" element={<Morale />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="*" element={<Navigate to="/quality" replace />} />
      </Routes>
    </div>
  );
}
