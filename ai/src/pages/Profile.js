import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function Profile() {
  const navigate = useNavigate();

  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("Not logged in. Please log in first.");
      return;
    }

    fetch(`${API_URL}/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile.");
        setLoading(false);
      });
  }, [userId]);

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

        {loading && <div className="empty"><div className="empty-title">Loading profile…</div></div>}
        {error && <div className="empty"><div className="empty-title" style={{ color: "red" }}>{error}</div></div>}

        {profile && (
          <section className="profile-grid">
            {/* BASIC INFO SUMMARY */}
            <div className="panel">
              <div className="panel-head">
                <h2>Basic information</h2>
                <span className="pill">Summary</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-label">Username</div>
                  <div className="summary-value">{profile.username || "—"}</div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Email</div>
                  <div className="summary-value">{profile.email || "—"}</div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Age</div>
                  <div className="summary-value">{profile.age ?? "—"}</div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Gender</div>
                  <div className="summary-value">{profile.gender || "—"}</div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Goals</div>
                  <div className="summary-value">
                    {profile.goals && profile.goals.length > 0
                      ? profile.goals.join(", ")
                      : "—"}
                  </div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Dietary restrictions</div>
                  <div className="summary-value">
                    {profile.restrictions && profile.restrictions.length > 0
                      ? profile.restrictions.join(", ")
                      : "None"}
                  </div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Telegram</div>
                  <div className="summary-value">
                    {profile.telegramUsername ? `@${profile.telegramUsername}` : "Not linked"}
                  </div>
                </div>
              </div>
            </div>

            {/* ACCOUNT SECTION */}
            <div className="panel">
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
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
