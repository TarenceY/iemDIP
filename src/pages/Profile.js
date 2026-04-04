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

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Delete account state
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  function handleLogout() {
    localStorage.removeItem("seefood_user_id");
    localStorage.removeItem("seefood_username");
    navigate("/login");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setPwLoading(true);
    try {
      const resp = await fetch(`${API_URL}/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to change password");
      setPwSuccess("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => { setShowPwForm(false); setPwSuccess(""); }, 2000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError("");

    if (!deletePw) {
      setDeleteError("Enter your password to confirm.");
      return;
    }

    setDeleteLoading(true);
    try {
      const resp = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePw }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to delete account");
      localStorage.removeItem("seefood_user_id");
      localStorage.removeItem("seefood_username");
      navigate("/login");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div
          className="profile-brand"
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
          <button className="profile-nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button
            className="profile-nav-btn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="profile-nav-btn"
            onClick={() => navigate("/history")}
          >
            History
          </button>
          <button
            className="profile-nav-btn active"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
        </nav>

        <button className="profile-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="profile-content">
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

        {loading && (
          <div className="empty">
            <div className="empty-title">Loading profile…</div>
          </div>
        )}

        {error && (
          <div className="empty">
            <div className="empty-title" style={{ color: "red" }}>
              {error}
            </div>
          </div>
        )}

        {profile && (
          <section className="profile-grid">
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
                  onClick={() => { setShowPwForm((v) => !v); setPwError(""); setPwSuccess(""); }}
                >
                  {showPwForm ? "Cancel" : "Change"}
                </button>
              </div>

              {showPwForm && (
                <form className="inline-form" onSubmit={handleChangePassword}>
                  <input
                    className="text-input"
                    type="password"
                    placeholder="Current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                  />
                  <input
                    className="text-input"
                    type="password"
                    placeholder="New password (min. 6 chars)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    required
                  />
                  <input
                    className="text-input"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                  />
                  {pwError && <div className="form-error">{pwError}</div>}
                  {pwSuccess && <div className="form-success">{pwSuccess}</div>}
                  <button className="primary-btn" type="submit" disabled={pwLoading}>
                    {pwLoading ? "Saving…" : "Save new password"}
                  </button>
                </form>
              )}

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
                  onClick={() => { setShowDeleteForm((v) => !v); setDeleteError(""); }}
                >
                  {showDeleteForm ? "Cancel" : "Delete"}
                </button>
              </div>

              {showDeleteForm && (
                <form className="inline-form" onSubmit={handleDeleteAccount}>
                  <div className="form-error" style={{ marginBottom: 8 }}>
                    This will permanently delete your account and all your data.
                  </div>
                  <input
                    className="text-input"
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={deletePw}
                    onChange={(e) => setDeletePw(e.target.value)}
                    required
                  />
                  {deleteError && <div className="form-error">{deleteError}</div>}
                  <button className="danger-btn" type="submit" disabled={deleteLoading}>
                    {deleteLoading ? "Deleting…" : "Permanently delete my account"}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}