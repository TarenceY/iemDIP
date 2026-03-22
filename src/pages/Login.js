import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";
import bgImage from "../assets/images/bg-food.png";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
import { loginUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.message || "Incorrect email or password. Please try again.");
        return;
      }

      localStorage.setItem("seefood_logged_in", "true");
      localStorage.setItem("seefood_user_email", email.trim().toLowerCase());
      localStorage.setItem("seefood_user_id", data.userId);
      if (data.username) localStorage.setItem("seefood_username", data.username);

      navigate("/home");
    } catch (err) {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      <main className="login-shell">
        <section className="login-left">
          <div className="login-left-card">
            <p className="login-kicker">SMART FOOD TRACKING</p>
            <h1>Welcome back</h1>
            <p className="login-description">
              Log in to track your meals, check your nutrition, and plan what to
              cook with the ingredients you already have.
            </p>

            <div className="left-badges">
              <span className="badge">AI Nutrition</span>
              <span className="badge">Fridge Scan</span>
              <span className="badge">Meal Planner</span>
            </div>
          </div>
        </section>

        <section className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>Log in</h2>
              <p>Use your email to continue to SeeFood.</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
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
                onKeyDown={onKeyDown}
              />
            </div>

            <button className="login-btn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <p className="signup-text">
              Don&apos;t have an account?{" "}
              <span className="signup-link" onClick={() => navigate("/signup")}>
                Sign up
              </span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}