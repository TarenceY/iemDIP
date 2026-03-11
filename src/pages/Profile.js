import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { getUserInfo } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("seefood_user_id");
    if (!userId) {
      navigate("/login");
      return;
    }

    getUserInfo(userId)
      .then((data) => {
        setProfile({
          name: data.username || "",
          age: data.age || "—",
          gender: data.gender || "—",
          goals: data.goals || [],
          restrictions: data.restrictions || [],
          dislikes: data.dislikes || [],
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <AppLayout activePage="profile">
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

        {loading && <p>Loading profile…</p>}
        {error && <p className="login-error">{error}</p>}

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
                  <div className="summary-label">Goals</div>
                  <div className="summary-value">
                    {profile.goals.length > 0 ? profile.goals.join(", ") : "—"}
                  </div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Dietary restrictions</div>
                  <div className="summary-value">
                    {profile.restrictions.length > 0 ? profile.restrictions.join(", ") : "None"}
                  </div>
                </div>

                <div className="summary-item">
                  <div className="summary-label">Dislikes</div>
                  <div className="summary-value">
                    {profile.dislikes.length > 0 ? profile.dislikes.join(", ") : "None"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ACCOUNT */}
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
    </AppLayout>
  );
}
