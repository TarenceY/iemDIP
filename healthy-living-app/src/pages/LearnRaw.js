import { useNavigate } from "react-router-dom";
import "../styles/LearnMore.css";

export default function LearnRaw() {
  const navigate = useNavigate();

  return (
    <div className="learn-container">

      <button className="back-btn" onClick={() => navigate("/")}>
        ← Back to SeeFood
      </button>

      <h1>Raw Ingredients — AI Smart Meal Prep</h1>

      <p>
        Not sure what to cook? SeeFood scans your fridge and pantry, identifies
        ingredients you already own, and recommends recipes instantly.
      </p>

      <p>
        Reduce food waste, save money, and eliminate the stress of meal planning —
        all powered by smart AI.
      </p>

      {/* HOW IT WORKS */}
      <div className="learn-section">
        <h3>How It Works</h3>

        <div className="learn-steps">
          <div className="step-card">
            <div className="step-number">Step 1</div>
            Scan your fridge or ingredients
          </div>

          <div className="step-card">
            <div className="step-number">Step 2</div>
            AI identifies available items
          </div>

          <div className="step-card">
            <div className="step-number">Step 3</div>
            Smart recipes are generated
          </div>

          <div className="step-card">
            <div className="step-number">Step 4</div>
            Cook meals using what you already have
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="learn-cta">
        <button onClick={() => navigate("/signup")}>
          Start Planning Meals
        </button>
      </div>

    </div>
  );
}
