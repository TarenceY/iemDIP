// Home.js
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "../styles/Home.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function Home() {
  const navigate = useNavigate();
  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);
  const fallbackUsername = localStorage.getItem("seefood_username") || "";

  const [username, setUsername] = useState(fallbackUsername);

  useEffect(() => {
    if (!userId) return;

    fetch(`${API_URL}/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const name = data.username || fallbackUsername || "";
        setUsername(name);
        if (name) localStorage.setItem("seefood_username", name);
      })
      .catch(() => {
        setUsername(fallbackUsername);
      });
  }, [userId, fallbackUsername]);

  return (
    <div className="home-container">
      {/* TOP NAVBAR */}
      <header className="home-header">
        <div
          className="home-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/home");
          }}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="profile-nav">
          <button className="nav-btn active" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="nav-btn" onClick={() => navigate("/history")}>
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

      {/* MAIN CONTENT */}
      <main className="home-content">
        {/* Welcome + Calories Panel */}
        <section className="home-panel">
          <div className="panel-head">
            <div>
              <h1 className="welcome">
                Welcome back{username ? `, ${username}` : ""} !
              </h1>
              <p className="welcome-sub">Let’s keep you on track today.</p>
            </div>
          </div>

          <div className="panel-grid">
            {/* Donut placeholder */}
            <div className="calorie-ring" aria-label="Calories remaining">
              <div className="ring-center">
                <div className="ring-kcal">1240</div>
                <div className="ring-sub">kcal left</div>
              </div>
            </div>

            {/* Macro bars placeholder */}
            <div className="macro-list">
              <MacroRow label="Carbs" value="120g" pct={37} />
              <MacroRow label="Protein" value="70g" pct={93} />
              <MacroRow label="Fats" value="20g" pct={45} />
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="home-section">
          <h2 className="section-title">What do you want to do today?</h2>

          <div className="action-grid">
            <button
              className="action-card"
              onClick={() => navigate("/scan-meal")}
            >
              <div className="action-top">
                <span className="action-kicker">Track</span>
                <span className="action-title">Upload your meal</span>
              </div>
              <p className="action-desc">
                Estimate calories & macros from a photo.
              </p>
              <span className="ghost-btn action-cta">Scan meal →</span>
            </button>

            <button
              className="action-card"
              onClick={() => navigate("/scan-ingredients")}
            >
              <div className="action-top">
                <span className="action-kicker">Plan</span>
                <span className="action-title">Upload your fridge</span>
              </div>
              <p className="action-desc">
                Get recipe ideas using what you already have.
              </p>
              <span className="ghost-btn action-cta">Scan ingredients →</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function MacroRow({ label, value, pct }) {
  return (
    <div className="macro-row">
      <div className="macro-left">
        <div className="macro-label">{label}</div>
        <div className="macro-value">{value}</div>
      </div>

      <div className="macro-bar" aria-label={`${label} progress`}>
        <div className="macro-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="macro-pct">{pct}%</div>
    </div>
  );
}