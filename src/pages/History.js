import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/History.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function History() {
  const navigate = useNavigate();

  // Demo history data (replace with real backend later)
  const [historyItems] = useState([
    {
      id: "h1",
      type: "tracked", // tracked | planned
      date: "2026-02-10",
      title: "Chicken quinoa bowl",
      subtitle: "Estimated nutrition: 520 kcal • High protein",
      ingredients: ["Chicken breast", "Quinoa", "Cherry tomatoes", "Spinach"],
    },
    {
      id: "h2",
      type: "planned",
      date: "2026-02-09",
      title: "Blueberry yogurt parfait",
      subtitle: "Suggested recipe using scanned ingredients",
      ingredients: ["Greek yogurt", "Blueberries", "Granola", "Honey"],
    },
    {
      id: "h3",
      type: "tracked",
      date: "2026-02-08",
      title: "Salmon & greens",
      subtitle: "Estimated nutrition: 610 kcal • Omega-3 rich",
      ingredients: ["Salmon", "Mixed greens", "Lemon"],
    },
  ]);

  // Demo grocery list add result
  const [toast, setToast] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | tracked | planned

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return historyItems.filter((item) => {
      const matchesFilter = filter === "all" ? true : item.type === filter;

      const matchesQuery = !q
        ? true
        : item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.ingredients.some((ing) => ing.toLowerCase().includes(q));

      return matchesFilter && matchesQuery;
    });
  }, [historyItems, query, filter]);

  function addToGrocery(item) {
    // For now just show a little toast; later you can connect this
    // to the grocery list state or backend.
    setToast(`Added ${item.ingredients.length} items to grocery list ✅`);
    window.clearTimeout(window.__seefood_toast);
    window.__seefood_toast = window.setTimeout(() => setToast(""), 1800);
  }

  function formatDate(iso) {
    // Simple display (e.g., 10 Feb 2026)
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="history-container">
      {/* TOP NAVBAR (same layout as Dashboard/Home) */}
      <header className="history-header">
        <div
          className="history-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="profile-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="nav-btn active" onClick={() => navigate("/history")}>
            History
          </button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </nav>

        <button className="nav-btn" onClick={() => navigate("/login")}>
          Log out
        </button>
      </header>

      <main className="history-content">
        <section className="history-hero">
          <h1>Meal History</h1>
          <p className="history-subtitle">
            Everything you’ve scanned or saved shows up here.
          </p>

          <div className="controls">
            <input
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search meals, notes, ingredients..."
              aria-label="Search history"
            />

            <div className="chips" role="tablist" aria-label="Filters">
              <button
                className={`chip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={`chip ${filter === "tracked" ? "active" : ""}`}
                onClick={() => setFilter("tracked")}
              >
                Tracked meals
              </button>
              <button
                className={`chip ${filter === "planned" ? "active" : ""}`}
                onClick={() => setFilter("planned")}
              >
                Planned meals
              </button>
            </div>
          </div>
        </section>

        {/* LIST */}
        <section className="history-panel">
          <div className="panel-head">
            <h2>Recent</h2>
            <span className="pill">{filtered.length} items</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No results</div>
              <div className="empty-text">
                Try a different search or switch filters.
              </div>
            </div>
          ) : (
            <div className="history-grid">
              {filtered.map((item) => (
                <article className="history-card" key={item.id}>
                  <div className="card-top">
                    <span className="date">{formatDate(item.date)}</span>
                    <span className={`tag ${item.type}`}>
                      {item.type === "tracked" ? "Tracked" : "Planned"}
                    </span>
                  </div>

                  <h3 className="title">{item.title}</h3>
                  <p className="subtitle">{item.subtitle}</p>

                  <div className="ingredients">
                    <div className="ingredients-label">Ingredients</div>
                    <div className="ingredient-chips">
                      {item.ingredients.slice(0, 6).map((ing) => (
                        <span className="ing-chip" key={ing}>
                          {ing}
                        </span>
                      ))}
                      {item.ingredients.length > 6 && (
                        <span className="ing-chip more">
                          +{item.ingredients.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="ghost-btn" onClick={() => addToGrocery(item)}>
                      + Add ingredients to grocery list
                    </button>
                    <button className="link-btn" onClick={() => navigate("/dashboard")}>
                      Back to dashboard →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* TOAST */}
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}
