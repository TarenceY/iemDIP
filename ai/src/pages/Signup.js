import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

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

  return (
    <div className="signup-page">
      {/* LEFT BRAND PANEL */}
      <div className="signup-left">
        <div className="brand">
          <img src={seefoodLogo} alt="SeeFood logo" className="brand-logo" />
          <div className="brand-name">SeeFood</div>
        </div>

        <h1>Create your account</h1>
        <p>
          Set up your profile once, then SeeFood can personalize nutrition insights and meal
          suggestions based on your lifestyle.
        </p>

        <div className="left-badges">
          <div className="badge">Personal Profile</div>
          <div className="badge">Nutrition Tracking</div>
          <div className="badge">Smart Meal Prep</div>
        </div>

        <div className="left-footer">IM3180 • Group IE01</div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="signup-right">
        <div className="signup-card">
          <div className="signup-header">
            <h2>Sign up</h2>
            <p>Fill in your details to get started.</p>
          </div>

          {/* EMAIL */}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="example@email.com"
              className="signup-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* USERNAME */}
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              className="signup-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* PASSWORDS */}
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

          {/* GENDER + WORKOUT */}
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

          {/* AGE */}
          <div className="field">
            <label>Age</label>
            <input
              type="number"
              placeholder="Age"
              className="signup-input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          {/* ACTIVITY LEVEL */}
          <div className="activity-section">
            <div className="activity-title">Activeness Level</div>

            <label className="activity-option">
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

            <label className="activity-option">
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

            <label className="activity-option">
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

            <label className="activity-option">
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

          {/* TERMS */}
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

          {/* SUBMIT */}
          <button className="primary-btn" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating account…" : "Continue"}
          </button>

          {/* ERROR */}
          {error && <div className="signup-error">{error}</div>}

          <p className="login-text">
            Already have an account?{" "}
            <span className="login-link" onClick={() => navigate("/login")}>
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
