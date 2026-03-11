import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg"; 
import { loginUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    // basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(email.trim().toLowerCase(), password);

      localStorage.setItem("seefood_logged_in", "true");
      localStorage.setItem("seefood_user_email", email.trim().toLowerCase());
      localStorage.setItem("seefood_user_id", data.userId);
      localStorage.setItem("seefood_username", data.username);

      navigate("/home");
    } catch (err) {
      setError(err.message || "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
       {/* LEFT BRAND PANEL */}
      <div className="login-left">
        <div className="brand">
          <img src={seefoodLogo} alt="SeeFood logo" className="brand-logo" />
          <div className="brand-name">SeeFood</div>
        </div>

        <h1>Welcome back 👋</h1>
        <p>
          Track nutrition from ready meals, and plan what to cook using ingredients you already have —
          all in one place.
        </p>

        <div className="left-badges">
          <div className="badge">AI Nutrition</div>
          <div className="badge">Fridge Scan</div>
          <div className="badge">Meal Planner</div>
        </div>

        <div className="left-footer">
          <span>IM3180 • Group IE01</span>
        </div>
      </div>
      {/* RIGHT SIDE (you can keep your left side as-is) */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>Log in</h2>
            <p>Use your email to continue.</p>
          </div>

          {/* ✅ Error message */}
          {error && <div className="login-error">{error}</div>}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="example@email.com"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>

          <p className="signup-text">
            Don't have an account?{" "}
            <span className="signup-link" onClick={() => navigate("/signup")}>
              Sign Up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
