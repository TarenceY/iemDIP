import { useEffect, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EditProfile.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function EditProfile() {
  const navigate = useNavigate();

  // For now: same demo profile data (later swap with backend/store)
  const [profile, setProfile] = useState({
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

  const goals = useMemo(
    () => ["Balanced eating", "Lose weight", "Gain muscle", "Maintain weight"],
    []
  );

  const genderOptions = useMemo(
    () => ["Female", "Male", "Non-binary", "Prefer not to say"],
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

  function save() {
    // TODO: call backend later
    navigate("/profile");
  }

  return (
    <AppLayout activePage="profile">
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
            <button className="primary-btn" onClick={save}>
              Save changes
            </button>
          </div>
        </section>

        <section className="editprofile-grid">
          {/* Basic info */}
          <div className="panel">
            <div className="panel-head">
              <h2>Basic information</h2>
              <span className="pill">Edit</span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input
                  className="text-input"
                  value={profile.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Age</label>
                <input
                  className="text-input"
                  type="number"
                  min="1"
                  value={profile.age}
                  onChange={(e) => updateField("age", Number(e.target.value))}
                />
              </div>

              <div className="field">
                <label>Gender</label>
                <select
                  className="select-input"
                  value={profile.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
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
                  value={profile.goal}
                  onChange={(e) => updateField("goal", e.target.value)}
                >
                  {goals.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Dietary preference</label>
                <select
                  className="select-input"
                  value={profile.dietaryPreference}
                  onChange={(e) => updateField("dietaryPreference", e.target.value)}
                >
                  {diets.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Allergies</label>
                <input
                  className="text-input"
                  value={profile.allergies}
                  onChange={(e) => updateField("allergies", e.target.value)}
                  placeholder="e.g., peanuts, shellfish"
                />
              </div>
            </div>
          </div>

          {/* Nutrition targets */}
          <div className="panel">
            <div className="panel-head">
              <h2>Nutrition targets</h2>
              <span className="pill">Daily</span>
            </div>

            <div className="targets">
              <div className="target">
                <div className="target-top">
                  <span className="target-label">Calories (kcal)</span>
                  <span className="target-value">{profile.dailyCalories}</span>
                </div>

                <input
                  className="range"
                  type="range"
                  min="1200"
                  max="3500"
                  step="50"
                  value={profile.dailyCalories}
                  onChange={(e) => updateField("dailyCalories", Number(e.target.value))}
                />

                <div className="range-meta">
                  <span>1200</span>
                  <span>3500</span>
                </div>
              </div>

              <div className="macro-grid">
                <div className="macro">
                  <label>Protein (g)</label>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    value={profile.proteinGoal}
                    onChange={(e) => updateField("proteinGoal", Number(e.target.value))}
                  />
                </div>

                <div className="macro">
                  <label>Carbs (g)</label>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    value={profile.carbsGoal}
                    onChange={(e) => updateField("carbsGoal", Number(e.target.value))}
                  />
                </div>

                <div className="macro">
                  <label>Fats (g)</label>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    value={profile.fatsGoal}
                    onChange={(e) => updateField("fatsGoal", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="note">
                These targets help SeeFood personalise nutrition estimates and recipe suggestions.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
