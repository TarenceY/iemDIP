import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function Home() {
  const navigate = useNavigate();

  // Optional: change name later when you have auth user info
  const name = useMemo(() => "there", []);

  return (
    <div className="home-container">
      {/* TOP NAVBAR */}
      <header className="home-header">
        <div
          className="home-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
          <span>SeeFood</span>
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

        <button className="logout-btn" onClick={() => navigate("/login")}>
          Log out
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="home-content">
        {/* HERO */}
        <section className="home-hero">
          <div className="hero-left">
            <h1>Welcome back, {name} 👋</h1>
            <p className="subtitle">
              Track meals, plan recipes from your fridge, and stay on top of your health goals.
            </p>

            <div className="quick-actions">
              <button className="chip-btn" onClick={() => navigate("/dashboard")}>
                📊 Dashboard
              </button>
              <button className="chip-btn" onClick={() => navigate("/history")}>
                🗂 History
              </button>
              <button className="chip-btn" onClick={() => navigate("/profile")}>
                ⚙️ Profile
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-mini-card">
              <div className="mini-title">Today’s tip</div>
              <div className="mini-text">
                Try adding a vegetable to your next meal for an easy nutrition boost.
              </div>
            </div>
            <div className="hero-mini-card">
              <div className="mini-title">Quick start</div>
              <div className="mini-text">
                Scan a meal to estimate calories, or scan ingredients to get recipe ideas.
              </div>
            </div>
          </div>
        </section>

        {/* MAIN ACTION CARDS */}
        <section className="home-section">
          <h2 className="section-title">What would you like to do?</h2>

          <div className="home-cards">
            <div className="home-card big">
              <div className="card-top">
                <div className="card-icon">🍽</div>
                <div>
                  <h3>Track a Meal</h3>
                  <p>
                    Take a photo of a ready meal to estimate calories and nutrition.
                  </p>
                </div>
              </div>

              <ul className="card-bullets">
                <li>Estimated calories + macros</li>
                <li>Save result to history</li>
                <li>Track weekly progress</li>
              </ul>

              <div className="card-actions">
                <button
                  className="primary-btn"
                  onClick={() => navigate("/scan-meal")}
                >
                  Scan Meal
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => navigate("/history")}
                >
                  View past meals →
                </button>
              </div>
            </div>

            <div className="home-card big">
              <div className="card-top">
                <div className="card-icon">🥕</div>
                <div>
                  <h3>Plan a Meal</h3>
                  <p>
                    Scan your fridge to get meal ideas using ingredients you already have.
                  </p>
                </div>
              </div>

              <ul className="card-bullets">
                <li>Recipe suggestions</li>
                <li>Auto-generate grocery list</li>
                <li>Save planned meals</li>
              </ul>

              <div className="card-actions">
                <button
                  className="primary-btn"
                  onClick={() => navigate("/scan-ingredients")}
                >
                  Scan Ingredients
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to dashboard →
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
