import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EditProfile.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";
import { getUserInfo, updateProfile } from "../services/api";

export default function EditProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    age: "",
    gender: "",
    goals: [],
    restrictions: [],
    dislikes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          age: data.age || "",
          gender: data.gender || "",
          goals: data.goals || [],
          restrictions: data.restrictions || [],
          dislikes: data.dislikes || [],
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const genderOptions = useMemo(
    () => ["Female", "Male", "Non-binary", "Prefer not to say"],
    []
  );

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setError("");
    const userId = localStorage.getItem("seefood_user_id");
    if (!userId) {
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const updates = {
        gender: profile.gender,
        restrictions: profile.restrictions,
        dislikes: profile.dislikes,
        goals: profile.goals,
      };
      if (profile.age) updates.age = Number(profile.age);
      await updateProfile(userId, updates);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editprofile-container">
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
          <button className="nav-btn" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate("/history")}>History</button>
          <button className="nav-btn active" onClick={() => navigate("/profile")}>Profile</button>
        </nav>

        <button className="nav-btn" onClick={() => {
          ["seefood_logged_in","seefood_user_email","seefood_user_id","seefood_username"].forEach(k => localStorage.removeItem(k));
          navigate("/login");
        }}>Log out</button>
      </header>

      <main className="editprofile-content">
        <section className="editprofile-hero">
          <div>
            <h1>Edit Profile</h1>
            <p className="editprofile-subtitle">
              Update your preferences and nutrition targets.
            </p>
          </div>

          <div className="editprofile-actions">
            <button className="ghost-btn" onClick={() => navigate("/profile")}>
              Cancel
            </button>
            <button className="primary-btn" onClick={save} disabled={saving || loading}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>

        {error && <p className="login-error">{error}</p>}

        {!loading && (
          <section className="editprofile-grid">
            {/* Basic info */}
            <div className="panel">
              <div className="panel-head">
                <h2>Basic information</h2>
                <span className="pill">Edit</span>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Age</label>
                  <input
                    className="text-input"
                    type="number"
                    min="1"
                    value={profile.age}
                    onChange={(e) => updateField("age", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Gender</label>
                  <select
                    className="select-input"
                    value={profile.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  >
                    <option value="">Select</option>
                    {genderOptions.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Goals (comma-separated)</label>
                  <input
                    className="text-input"
                    value={profile.goals.join(", ")}
                    onChange={(e) =>
                      updateField(
                        "goals",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. Lose weight, Gain muscle"
                  />
                </div>

                <div className="field">
                  <label>Dietary restrictions (comma-separated)</label>
                  <input
                    className="text-input"
                    value={profile.restrictions.join(", ")}
                    onChange={(e) =>
                      updateField(
                        "restrictions",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. Vegetarian, Halal"
                  />
                </div>

                <div className="field">
                  <label>Dislikes (comma-separated)</label>
                  <input
                    className="text-input"
                    value={profile.dislikes.join(", ")}
                    onChange={(e) =>
                      updateField(
                        "dislikes",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. mushrooms, olives"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
