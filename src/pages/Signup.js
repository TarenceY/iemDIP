import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [workout, setWorkout] = useState("");
  const [activity, setActivity] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (
      !email.trim() ||
      !username.trim() ||
      !password ||
      !confirmPassword ||
      !gender ||
      !age ||
      !workout ||
      !activity
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim(),
          password,
          age: Number(age),
          gender,
          goals: [activity],
          restrictions: [],
          dislikes: [],
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.message || "Registration failed. Please try again.");
        return;
      }

      navigate("/login");
    } catch (err) {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="signup-page">
      <main className="signup-shell">
        <section className="signup-left">
          <div className="signup-left-card">
            <p className="signup-kicker">PERSONALIZED NUTRITION STARTS HERE</p>
            <h1>Create your account</h1>
            <p className="signup-description">
              Set up your profile once, and SeeFood can personalize nutrition
              insights and meal suggestions based on your lifestyle.
            </p>

            <div className="left-badges">
              <span className="badge">Personal Profile</span>
              <span className="badge">Nutrition Tracking</span>
              <span className="badge">Smart Meal Prep</span>
            </div>
          </div>
        </section>

        <section className="signup-right">
          <div className="signup-card">
            <div className="signup-header">
              <h2>Sign up</h2>
              <p>Fill in your details to get started.</p>
            </div>

            {error && <div className="signup-error">{error}</div>}

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                className="signup-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="field">
              <label>Username</label>
              <input
                type="text"
                placeholder="Choose a username"
                className="signup-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Password</label>
                <div className="password-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Create a password"
                    className="signup-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onKeyDown}
                  />
                  <button
                    type="button"
                    className="show-btn"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Confirm Password</label>
                <div className="password-wrap">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    placeholder="Confirm password"
                    className="signup-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={onKeyDown}
                  />
                  <button
                    type="button"
                    className="show-btn"
                    onClick={() => setShowConfirmPw((v) => !v)}
                  >
                    {showConfirmPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Gender</label>
                <select
                  className="signup-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Prefer not to say</option>
                </select>
              </div>

              <div className="field">
                <label>Workout Frequency</label>
                <select
                  className="signup-input"
                  value={workout}
                  onChange={(e) => setWorkout(e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Never</option>
                  <option>1–2 times per week</option>
                  <option>3–4 times per week</option>
                  <option>5–6 times per week</option>
                  <option>Daily</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Age</label>
              <input
                type="number"
                placeholder="Age"
                className="signup-input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="activity-section">
              <div className="activity-title">Activeness Level</div>

              <label className={`activity-option ${activity === "sedentary" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="activity"
                  value="sedentary"
                  checked={activity === "sedentary"}
                  onChange={(e) => setActivity(e.target.value)}
                />
                <div className="activity-text">
                  <strong>Sedentary</strong>
                  <span>Little to no activity, desk bound</span>
                </div>
              </label>

              <label className={`activity-option ${activity === "light" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="activity"
                  value="light"
                  checked={activity === "light"}
                  onChange={(e) => setActivity(e.target.value)}
                />
                <div className="activity-text">
                  <strong>Light</strong>
                  <span>Light activity, some standing and walking</span>
                </div>
              </label>

              <label className={`activity-option ${activity === "moderate" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="activity"
                  value="moderate"
                  checked={activity === "moderate"}
                  onChange={(e) => setActivity(e.target.value)}
                />
                <div className="activity-text">
                  <strong>Moderate</strong>
                  <span>On feet most days, moderate activity</span>
                </div>
              </label>

              <label className={`activity-option ${activity === "high" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="activity"
                  value="high"
                  checked={activity === "high"}
                  onChange={(e) => setActivity(e.target.value)}
                />
                <div className="activity-text">
                  <strong>High</strong>
                  <span>Workout and exercise routinely</span>
                </div>
              </label>
            </div>

            <div className="signup-footer">
              <label className="terms">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I agree with the <span className="fake-link">Terms</span> and{" "}
                  <span className="fake-link">Privacy Policy</span>.
                </span>
              </label>

              <button className="primary-btn" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Creating account..." : "Continue"}
              </button>

              <p className="login-text">
                Already have an account?{" "}
                <span className="login-link" onClick={() => navigate("/login")}>
                  Log in
                </span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}