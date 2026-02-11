import { useNavigate } from "react-router-dom";
import "../styles/LearnMore.css";

export default function LearnReady() {
  const navigate = useNavigate();

  return (
    <div className="learn-container">

      <button className="back-btn" onClick={() => navigate("/")}>
        ← Back to SeeFood
      </button>

      <h1>Ready Meals — Smart Nutrition Tracking</h1>

      <p>
        Already have food prepared? SeeFood lets you instantly understand what
        you’re eating by snapping a photo — no calorie guessing, no manual entry.
      </p>

      <p>
        Our AI analyzes portion size, food type, and nutrition values to help
        you make healthier decisions with zero effort.
      </p>

      {/* HOW IT WORKS */}
      <div className="learn-section">
        <h3>How It Works</h3>

        <div className="learn-steps">
          <div className="step-card">
            <div className="step-number">Step 1</div>
            Take a photo of your meal
          </div>

          <div className="step-card">
            <div className="step-number">Step 2</div>
            AI detects food & portion size
          </div>

          <div className="step-card">
            <div className="step-number">Step 3</div>
            Instantly view calories & nutrients
          </div>

          <div className="step-card">
            <div className="step-number">Step 4</div>
            Track your eating habits over time
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="learn-cta">
        <button onClick={() => navigate("/signup")}>
          Start Tracking My Meals
        </button>
      </div>

    </div>
  );
}
