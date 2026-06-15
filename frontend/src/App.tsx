import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "./api/auth";

const Login = lazy(() => import("./pages/Login"));
const Quality = lazy(() => import("./pages/Quality"));
const Events = lazy(() => import("./pages/Events"));
const Morale = lazy(() => import("./pages/Morale"));
const Problems = lazy(() => import("./pages/Problems"));
const Calendar = lazy(() => import("./pages/Calendar"));

const TABS = [
  { to: "/quality", label: "Качество" },
  { to: "/events", label: "События" },
  { to: "/morale", label: "Моральный климат" },
  { to: "/problems", label: "Мероприятия" },
  { to: "/calendar", label: "Календарь" },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("dkkiur.theme") as "light" | "dark") || "light"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.backgroundColor = "var(--bg)";
    document.body.style.backgroundColor = "var(--bg)";
    localStorage.setItem("dkkiur.theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}

function PageFallback() {
  return <div className="card placeholder">Загрузка…</div>;
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { identity, loading } = useAuth();
  const location = useLocation();
  const isWidePage = location.pathname === "/events" || location.pathname === "/problems";

  if (loading) return <div className="wrap placeholder">Загрузка…</div>;
  if (!identity) {
    return (
      <Suspense fallback={<div className="wrap placeholder">Загрузка…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className={`wrap${isWidePage ? " wrap-wide" : ""}`}>
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/quality" replace />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/events" element={<Events />} />
          <Route path="/morale" element={<Morale />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="*" element={<Navigate to="/quality" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
