import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function Profile() {
  const navigate = useNavigate();

  // Demo profile data (swap with real user data later)
  const [profile] = useState({
    name: "Janice",
    age: 21,
    gender: "Female",
    goal: "Balanced eating",
    dietaryPreference: "No preference",
    allergies: "None",
    dailyCalories: 1800,
    proteinGoal: 110,
    carbsGoal: 220,
    fatsGoal: 60,
  });

  // These are not required on the view-only page, but kept here
  // in case you want to display selectable options later.
  useMemo(
    () => ["Balanced eating", "Lose weight", "Gain muscle", "Maintain weight"],
    []
  );
  useMemo(
    () => ["No preference", "Vegetarian", "Vegan", "Halal", "Keto", "Gluten-free"],
    []
  );

  return (
    <div className="profile-container">
      {/* TOP NAVBAR */}
      <header className="profile-header">
        <div
          className="profile-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
          <span>SeeFood</span>
        </div>

        <nav className="profile-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="nav-btn" onClick={() => navigate("/history")}>
            History
          </button>
          <button className="nav-btn active" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </nav>

        <button className="nav-btn" onClick={() => navigate("/login")}>
          Log out
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="profile-content">
        {/* HERO */}
        <section className="profile-hero">
          <div className="hero-left">
            <h1>Your Profile</h1>
            <p className="profile-subtitle">
              View your info and nutrition targets. Edit them on a separate page.
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" onClick={() => navigate("/profile/edit")}>
              Edit profile
            </button>
          </div>
        </section>

        {/* GRID */}
        <section className="profile-grid">
          {/* BASIC INFO SUMMARY */}
          <div className="panel">
            <div className="panel-head">
              <h2>Basic information</h2>
              <span className="pill">Summary</span>
            </div>

            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Name</div>
                <div className="summary-value">{profile.name}</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Age</div>
                <div className="summary-value">{profile.age}</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Gender</div>
                <div className="summary-value">{profile.gender}</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Goal</div>
                <div className="summary-value">{profile.goal}</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Dietary preference</div>
                <div className="summary-value">{profile.dietaryPreference}</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Allergies</div>
                <div className="summary-value">{profile.allergies}</div>
              </div>
            </div>
          </div>

          {/* NUTRITION TARGETS SUMMARY */}
          <div className="panel">
            <div className="panel-head">
              <h2>Nutrition targets</h2>
              <span className="pill">Daily</span>
            </div>

            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Calories</div>
                <div className="summary-value">{profile.dailyCalories} kcal</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Protein</div>
                <div className="summary-value">{profile.proteinGoal} g</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Carbs</div>
                <div className="summary-value">{profile.carbsGoal} g</div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Fats</div>
                <div className="summary-value">{profile.fatsGoal} g</div>
              </div>
            </div>

            <div className="note" style={{ marginTop: 14 }}>
              Want to change these? Use “Edit profile”.
            </div>
          </div>
        </section>

        {/* ACCOUNT (optional section stays here) */}
        <section className="panel account">
          <div className="panel-head">
            <h2>Account</h2>
            <span className="pill">Security</span>
          </div>

          <div className="account-row">
            <div>
              <div className="account-title">Change password</div>
              <div className="account-desc">
                Update your password regularly to keep your account safe.
              </div>
            </div>
            <button
              className="ghost-btn"
              onClick={() => alert("Hook this to your password flow!")}
            >
              Change
            </button>
          </div>

          <div className="divider" />

          <div className="account-row">
            <div>
              <div className="account-title">Delete account</div>
              <div className="account-desc">
                This action is permanent. Use carefully.
              </div>
            </div>
            <button
              className="danger-btn"
              onClick={() => alert("Hook this to your delete account flow!")}
            >
              Delete
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}