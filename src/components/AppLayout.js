import { useNavigate } from "react-router-dom";
import seefoodLogo from "../assets/images/seefood-logo.jpg";
import "../styles/AppLayout.css";

const NAV_LINKS = [
  { id: "home",      label: "Home" },
  { id: "dashboard", label: "Dashboard" },
  { id: "history",   label: "History" },
  { id: "profile",   label: "Profile" },
];

/**
 * Shared shell for all inner-app pages (Home, Dashboard, History, Profile).
 * Provides a consistent header + constrained content area so that the
 * logo/nav items and page body are always horizontally aligned.
 *
 * Props:
 *   activePage — one of "home" | "dashboard" | "history" | "profile"
 *   children   — page content rendered inside .app-content
 */
export default function AppLayout({ activePage, children }) {
  const navigate = useNavigate();

  function logout() {
    ["seefood_logged_in", "seefood_user_email", "seefood_user_id", "seefood_username"]
      .forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        {/* Inner wrapper keeps header items aligned with page content */}
        <div className="app-header-inner">
          <div
            className="app-brand"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/home")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/home");
            }}
          >
            <img src={seefoodLogo} alt="SeeFood logo" />
          </div>

          <nav className="app-nav">
            {NAV_LINKS.map(({ id, label }) => (
              <button
                key={id}
                className={`nav-btn${activePage === id ? " active" : ""}`}
                onClick={() => navigate(`/${id}`)}
              >
                {label}
              </button>
            ))}
          </nav>

          <button className="nav-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-content">{children}</main>
    </div>
  );
}
