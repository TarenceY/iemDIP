import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function Dashboard() {
  const navigate = useNavigate();

  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);

  // ── Grocery list state ────────────────────────────────────────────────────
  const [groceryItems, setGroceryItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  // ── Recent meals state ─────────────────────────────────────────────────────
  const [recentMeals, setRecentMeals] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);

  // ── Load grocery items from API ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/grocery?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setGroceryItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  // ── Load recent meals from API ────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setMealsLoading(false); return; }
    fetch(`${API_URL}/logs?userId=${userId}&limit=3`)
      .then((res) => res.json())
      .then((logs) => {
        const meals = Array.isArray(logs) ? logs.map((log) => ({
          id: log._id,
          title: log.food_name,
          desc:
            log.type === "planned"
              ? log.notes || "Planned meal from ingredient scan"
              : `${log.calories} kcal • Protein ${log.protein}g • Carbs ${log.carbs}g • Fats ${log.fats}g`,
          type: log.type || "tracked",
          date: log.created_at || log.log_date,
        })) : [];
        setRecentMeals(meals);
        setMealsLoading(false);
      })
      .catch(() => setMealsLoading(false));
  }, [userId]);

  const stats = useMemo(
    () => [
      { label: "Recent meals", value: String(recentMeals.length) },
      { label: "Grocery items", value: String(groceryItems.length) },
      { label: "Items remaining", value: String(groceryItems.filter((x) => !x.checked).length) },
      { label: "Checked off", value: String(groceryItems.filter((x) => x.checked).length) },
    ],
    [recentMeals.length, groceryItems]
  );

  // ── Grocery actions ───────────────────────────────────────────────────────
  async function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed || !userId) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = { _id: tempId, name: trimmed, category: "Uncategorised", checked: false };
    setGroceryItems((prev) => [...prev, optimistic]);
    setNewItem("");

    try {
      const resp = await fetch(`${API_URL}/grocery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: trimmed }),
      });
      const saved = await resp.json();
      setGroceryItems((prev) =>
        prev.map((it) => (it._id === tempId ? saved : it))
      );
    } catch {
      setGroceryItems((prev) => prev.filter((it) => it._id !== tempId));
    }
  }

  async function toggleItem(id, currentChecked) {
    setGroceryItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, checked: !currentChecked } : it))
    );
    try {
      await fetch(`${API_URL}/grocery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !currentChecked }),
      });
    } catch {
      setGroceryItems((prev) =>
        prev.map((it) => (it._id === id ? { ...it, checked: currentChecked } : it))
      );
    }
  }

  async function removeItem(id) {
    setGroceryItems((prev) => prev.filter((it) => it._id !== id));
    try {
      await fetch(`${API_URL}/grocery/${id}`, { method: "DELETE" });
    } catch {
      // Non-fatal — item is already gone from UI
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") addItem();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  }

  function handleLogout() {
    localStorage.removeItem("seefood_user_id");
    localStorage.removeItem("seefood_username");
    navigate("/login");
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div
          className="dashboard-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/home");
          }}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="dashboard-nav">
          <button className="dashboard-nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button
            className="dashboard-nav-btn active"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="dashboard-nav-btn"
            onClick={() => navigate("/history")}
          >
            History
          </button>
          <button
            className="dashboard-nav-btn"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
        </nav>

        <button className="dashboard-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="dashboard-content">
        <section className="dash-hero">
          <h1>My Health Dashboard</h1>
          <p className="dash-subtitle">
            Track meals, manage groceries, and view recent activity — all in one place.
          </p>
        </section>

        {/* TOP GRID */}
        <section className="dash-grid">
          <div className="panel">
            <div className="panel-head">
              <h2>Overview</h2>
              <span className="pill">Your account</span>
            </div>

            <div className="stats-grid">
              {stats.map((s) => (
                <div className="stat" key={s.label}>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="panel-note">
              Scan a meal or ingredients to build up your history and grocery list.
            </div>
          </div>

          {/* GROCERY LIST */}
          <div className="panel">
            <div className="panel-head">
              <h2>Grocery list</h2>
              <span className="pill">
                {groceryItems.filter((x) => !x.checked).length} left
              </span>
            </div>

            <div className="add-row">
              <input
                className="text-input"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Add an item (e.g., oats)"
                aria-label="Add grocery item"
              />
              <button className="primary-btn" onClick={addItem}>
                Add
              </button>
            </div>

            <div className="list">
              {groceryItems.length === 0 && (
                <div className="empty-list-note">
                  Your grocery list is empty. Add items above.
                </div>
              )}
              {groceryItems.map((item) => (
                <div className="list-row" key={item._id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item._id, item.checked)}
                    />
                    <span className="check-ui" />
                  </label>

                  <div className="item-main">
                    <div className={`item-name ${item.checked ? "done" : ""}`}>
                      {item.name}
                    </div>
                    <div className="item-meta">{item.category}</div>
                  </div>

                  <button
                    className="icon-btn"
                    onClick={() => removeItem(item._id)}
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LATELY */}
        <section className="panel lately">
          <div className="panel-head">
            <h2>Lately</h2>
            <span className="pill">Recent meals</span>
          </div>

          {mealsLoading && (
            <div className="panel-note">Loading recent meals…</div>
          )}

          {!mealsLoading && recentMeals.length === 0 && (
            <div className="panel-note">
              No meals scanned yet. Go to{" "}
              <button className="link-btn" onClick={() => navigate("/scan-meal")}>
                Scan Meal
              </button>{" "}
              to get started.
            </div>
          )}

          {!mealsLoading && recentMeals.length > 0 && (
            <div className="lately-grid">
              {recentMeals.map((m) => (
                <article className="meal-card" key={m.id}>
                  <div className="meal-top">
                    <span className="meal-day">{formatDate(m.date)}</span>
                    <span className="meal-chip">
                      {m.type === "planned" ? "Planned" : "Tracked"}
                    </span>
                  </div>
                  <h3 className="meal-title">{m.title}</h3>
                  <p className="meal-desc">{m.desc}</p>

                  <div className="meal-actions">
                    <button className="link-btn" onClick={() => navigate("/history")}>
                      View details →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
