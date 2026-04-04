import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/History.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function History() {
  const navigate = useNavigate();

  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | tracked | planned
  const [selectedItem, setSelectedItem] = useState(null); // for detail modal

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setFetchError("Not logged in. Please log in to view your history.");
      return;
    }

    fetch(`${API_URL}/logs?userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((logs) => {
        const items = logs.map((log) => ({
          id: log._id,
          type: log.type || "tracked",
          date: log.created_at || log.log_date,
          title: log.food_name,
          subtitle:
            log.type === "planned"
              ? log.notes || "Planned meal from ingredient scan"
              : `${log.calories} kcal • Protein ${log.protein}g • Carbs ${log.carbs}g • Fats ${log.fats}g`,
          ingredients: log.ingredients || [],
          calories: log.calories || 0,
          protein: log.protein || 0,
          carbs: log.carbs || 0,
          fats: log.fats || 0,
          highlights: log.highlights || [],
          suggestions: log.suggestions || [],
          notes: log.notes || "",
        }));
        setHistoryItems(items);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message || "Failed to load history.");
        setLoading(false);
      });
  }, [userId]);

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

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function handleLogout() {
    localStorage.removeItem("seefood_user_id");
    localStorage.removeItem("seefood_username");
    navigate("/login");
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <div
          className="history-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/home");
          }}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="history-nav">
          <button className="history-nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button
            className="history-nav-btn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="history-nav-btn active"
            onClick={() => navigate("/history")}
          >
            History
          </button>
          <button
            className="history-nav-btn"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
        </nav>

        <button className="history-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="history-content">
        <section className="history-hero">
          <h1>Meal History</h1>
          <p className="history-subtitle">
            Everything you've scanned or saved shows up here. Click a card to see the full analysis.
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

        <section className="history-panel">
          <div className="panel-head">
            <h2>Recent</h2>
            <span className="pill">
              {loading ? "Loading…" : `${filtered.length} items`}
            </span>
          </div>

          {loading && (
            <div className="empty">
              <div className="empty-title">Loading history…</div>
            </div>
          )}

          {!loading && fetchError && (
            <div className="empty">
              <div className="empty-title" style={{ color: "red" }}>
                {fetchError}
              </div>
            </div>
          )}

          {!loading && !fetchError && filtered.length === 0 && (
            <div className="empty">
              <div className="empty-title">
                {historyItems.length === 0 ? "No history yet" : "No results"}
              </div>
              <div className="empty-text">
                {historyItems.length === 0
                  ? "Scan a meal or save a recipe from Scan Ingredients to see it here."
                  : "Try a different search or switch filters."}
              </div>
            </div>
          )}

          {!loading && !fetchError && filtered.length > 0 && (
            <div className="history-grid">
              {filtered.map((item) => (
                <article
                  className="history-card clickable"
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedItem(item); }}
                >
                  <div className="card-top">
                    <span className="date">{formatDate(item.date)}</span>
                    <span className={`tag ${item.type}`}>
                      {item.type === "tracked" ? "Tracked" : "Planned"}
                    </span>
                  </div>

                  <h3 className="title">{item.title}</h3>
                  <p className="subtitle">{item.subtitle}</p>

                  {item.ingredients.length > 0 && (
                    <div className="ingredients">
                      <div className="ingredients-label">Ingredients</div>
                      <div className="ingredient-chips">
                        {item.ingredients.slice(0, 5).map((ing) => (
                          <span className="ing-chip" key={ing}>{ing}</span>
                        ))}
                        {item.ingredients.length > 5 && (
                          <span className="ing-chip more">
                            +{item.ingredients.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="card-footer">
                    <span className="view-hint">Tap to view full analysis →</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedItem.title}</div>
                <div className="modal-date">{formatDate(selectedItem.date)}</div>
              </div>
              <span className={`tag ${selectedItem.type}`}>
                {selectedItem.type === "tracked" ? "Tracked" : "Planned"}
              </span>
            </div>

            {selectedItem.type === "tracked" && (
              <>
                <div className="modal-calories">
                  <span className="cal-value">{selectedItem.calories}</span>
                  <span className="cal-unit">kcal</span>
                </div>

                <div className="modal-macros">
                  <div className="modal-macro">
                    <div className="macro-val">{selectedItem.protein}g</div>
                    <div className="macro-lbl">Protein</div>
                  </div>
                  <div className="modal-macro">
                    <div className="macro-val">{selectedItem.carbs}g</div>
                    <div className="macro-lbl">Carbs</div>
                  </div>
                  <div className="modal-macro">
                    <div className="macro-val">{selectedItem.fats}g</div>
                    <div className="macro-lbl">Fats</div>
                  </div>
                </div>

                {selectedItem.highlights.length > 0 && (
                  <div className="modal-section">
                    <div className="modal-section-label">Highlights</div>
                    <div className="modal-chips">
                      {selectedItem.highlights.map((h) => (
                        <span className="ing-chip" key={h}>{h}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.suggestions.length > 0 && (
                  <div className="modal-section">
                    <div className="modal-section-label">Suggestions</div>
                    <ul className="modal-suggestions">
                      {selectedItem.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {selectedItem.type === "planned" && (
              <>
                {selectedItem.notes && (
                  <div className="modal-section">
                    <div className="modal-section-label">Recipe</div>
                    <p className="modal-notes">{selectedItem.notes}</p>
                  </div>
                )}

                {selectedItem.ingredients.length > 0 && (
                  <div className="modal-section">
                    <div className="modal-section-label">Detected ingredients</div>
                    <div className="modal-chips">
                      {selectedItem.ingredients.map((ing) => (
                        <span className="ing-chip" key={ing}>{ing}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
