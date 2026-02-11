// src/pages/Dashboard.js
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function Dashboard() {
  const navigate = useNavigate();

  // Demo data (replace with your real data later)
  const [groceryItems, setGroceryItems] = useState([
    { id: 1, name: "Bananas", category: "Fruits & Veg", checked: false },
    { id: 2, name: "Milk", category: "Dairy", checked: true },
    { id: 3, name: "Eggs", category: "Dairy", checked: false },
    { id: 4, name: "Chicken breast", category: "Protein", checked: false },
    { id: 5, name: "Spinach", category: "Fruits & Veg", checked: false },
  ]);

  const [newItem, setNewItem] = useState("");

  const [recentMeals] = useState([
    {
      id: "m1",
      day: "Monday",
      title: "Chicken quinoa bowl",
      desc: "High protein, balanced carbs & fiber.",
    },
    {
      id: "m2",
      day: "Tuesday",
      title: "Blueberry yogurt parfait",
      desc: "Good calcium + antioxidants.",
    },
    {
      id: "m3",
      day: "Wednesday",
      title: "Salmon & greens",
      desc: "Omega-3 rich + micronutrients.",
    },
  ]);

  const stats = useMemo(
    () => [
      { label: "Meals tracked (7d)", value: "6" },
      { label: "Avg calories", value: "1,820" },
      { label: "Protein goal", value: "72%" },
      { label: "Grocery items", value: String(groceryItems.length) },
    ],
    [groceryItems.length]
  );

  function toggleItem(id) {
    setGroceryItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;

    setGroceryItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: trimmed,
        category: "Uncategorised",
        checked: false,
      },
    ]);
    setNewItem("");
  }

  function removeItem(id) {
    setGroceryItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addMealToGrocery(mealId) {
    // Simple demo: add common items per meal
    const additionsByMeal = {
      m1: ["Quinoa", "Chicken breast", "Cherry tomatoes"],
      m2: ["Greek yogurt", "Blueberries", "Granola"],
      m3: ["Salmon", "Mixed greens", "Lemon"],
    };

    const additions = additionsByMeal[mealId] ?? ["Ingredients"];
    setGroceryItems((prev) => {
      const existingLower = new Set(prev.map((x) => x.name.toLowerCase()));
      const toAdd = additions
        .filter((n) => !existingLower.has(n.toLowerCase()))
        .map((name) => ({
          id: Date.now() + Math.random(),
          name,
          category: "Suggested",
          checked: false,
        }));
      return [...prev, ...toAdd];
    });
  }

  function onKeyDown(e) {
    if (e.key === "Enter") addItem();
  }

  return (
    <div className="dash-container">
      {/* TOP NAV */}
      <header className="dash-header">
        <div className="dash-brand" role="button" tabIndex={0} onClick={() => navigate("/home")}>
          <img src={seefoodLogo} alt="SeeFood logo" />
          <span>SeeFood</span>
        </div>

        <nav className="profile-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="nav-btn active" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="nav-btn" onClick={() => navigate("/history")}>
            History
          </button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </nav>

        <button className="logout-btn" onClick={() => navigate("/login")}>
          Log out
        </button>
      </header>

      {/* PAGE */}
      <main className="dash-content">
        <section className="dash-hero">
          <h1>My Health Dashboard</h1>
          <p className="dash-subtitle">
            Track meals, manage groceries, and view recent activity — all in one place.
          </p>
        </section>

        {/* TOP GRID (left summary, right grocery list) */}
        <section className="dash-grid">
          <div className="panel">
            <div className="panel-head">
              <h2>Overview</h2>
              <span className="pill">This week</span>
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
              Tip: After scanning meals/ingredients, save results to history so you can see trends here.
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Grocery list</h2>
              <span className="pill">{groceryItems.filter((x) => !x.checked).length} left</span>
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
              {groceryItems.map((item) => (
                <div className="list-row" key={item.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className="check-ui" />
                  </label>

                  <div className="item-main">
                    <div className={`item-name ${item.checked ? "done" : ""}`}>
                      {item.name}
                    </div>
                    <div className="item-meta">{item.category}</div>
                  </div>

                  <button className="icon-btn" onClick={() => removeItem(item.id)} aria-label="Remove item">
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

          <div className="lately-grid">
            {recentMeals.map((m) => (
              <article className="meal-card" key={m.id}>
                <div className="meal-top">
                  <span className="meal-day">{m.day}</span>
                  <span className="meal-chip">Tracked</span>
                </div>
                <h3 className="meal-title">{m.title}</h3>
                <p className="meal-desc">{m.desc}</p>

                <div className="meal-actions">
                  <button className="ghost-btn" onClick={() => addMealToGrocery(m.id)}>
                    + Add to grocery list
                  </button>
                  <button className="link-btn" onClick={() => navigate("/history")}>
                    View details →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
