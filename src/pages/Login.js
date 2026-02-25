import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg"; 

export default function Login() {
  const navigate = useNavigate();

  const DUMMY_USER = {
    email: "test@seefood.com",
    password: "12345678",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    // basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    // check dummy credentials
    const ok =
      email.trim().toLowerCase() === DUMMY_USER.email.toLowerCase() &&
      password === DUMMY_USER.password;

    if (!ok) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    // ✅ Optional: store a simple “logged in” flag
    localStorage.setItem("seefood_logged_in", "true");
    localStorage.setItem("seefood_user_email", email.trim().toLowerCase());

    // go to home page
    navigate("/home");
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

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>

          <p className="signup-text">
            Don’t have an account?{" "}
            <span className="signup-link" onClick={() => navigate("/signup")}>
              Sign Up
            </span>
          </p>

          {/* ✅ Optional: show dummy credentials to testers */}
          <p className="dummy-hint">
            Demo login: <b>test@seefood.com</b> / <b>12345678</b>
          </p>
        </div>
      </div>
    </div>
  );
}
