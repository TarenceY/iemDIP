import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EditProfile.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function EditProfile() {
  const navigate = useNavigate();

  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);

  const [profile, setProfile] = useState({
    age: "",
    gender: "",
    goals: [],
    restrictions: [],
    dislikes: [],
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const goals = useMemo(
    () => ["Balanced eating", "Lose weight", "Gain muscle", "Maintain weight"],
    []
  );

  const diets = useMemo(
    () => ["No preference", "Vegetarian", "Vegan", "Halal", "Keto", "Gluten-free"],
    []
  );

  // Load current profile from API
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProfile({
          age: data.age ?? "",
          gender: data.gender || "",
          goals: data.goals || [],
          restrictions: data.restrictions || [],
          dislikes: data.dislikes || [],
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile.");
        setLoading(false);
      });
  }, [userId]);

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!userId) {
      setError("Not logged in.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/users/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: profile.age ? Number(profile.age) : undefined,
          gender: profile.gender || undefined,
          goals: profile.goals,
          restrictions: profile.restrictions,
          dislikes: profile.dislikes,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || `API error ${resp.status}`);
      }

      setToast("Profile saved ✅");
      window.setTimeout(() => setToast(""), 3000);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
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
        </div>

        <nav className="profile-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate("/history")}>History</button>
          <button className="nav-btn active" onClick={() => navigate("/profile")}>Profile</button>
        </nav>

        <button className="nav-btn" onClick={() => navigate("/login")}>Log out</button>
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
            <button className="primary-btn" onClick={save} disabled={isSaving || loading}>
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>

        {loading && <div className="panel"><div className="panel-head"><h2>Loading…</h2></div></div>}
        {error && <div style={{ color: "red", padding: "12px" }}>{error}</div>}

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
                    onChange={(e) => updateField("age", e.target.value === "" ? "" : Number(e.target.value))}
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
                    <option>Female</option>
                    <option>Male</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>

                <div className="field">
                  <label>Goal</label>
                  <select
                    className="select-input"
                    value={profile.goals[0] || ""}
                    onChange={(e) => updateField("goals", e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">Select</option>
                    {goals.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Dietary preference</label>
                  <select
                    className="select-input"
                    value={profile.restrictions[0] || ""}
                    onChange={(e) =>
                      updateField("restrictions", e.target.value ? [e.target.value] : [])
                    }
                  >
                    <option value="">No preference</option>
                    {diets.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Dislikes</h2>
                <span className="pill">Optional</span>
              </div>
              <div className="field">
                <label>Foods you dislike (comma-separated)</label>
                <input
                  className="text-input"
                  value={profile.dislikes.join(", ")}
                  onChange={(e) =>
                    updateField(
                      "dislikes",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="e.g., broccoli, mushrooms"
                />
              </div>
            </div>
          </section>
        )}

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}
