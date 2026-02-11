import "../styles/Welcome.css";
import { useNavigate } from "react-router-dom";
import readyMeal from "../assets/images/features/ready-meal.jpg";
import rawIngredients from "../assets/images/features/raw-ingredients.jpg";
import smartDecisions from "../assets/images/features/smart-decisions.jpg";
import aiInsights from "../assets/images/features/ai-insights.jpg";
import healthyEating from "../assets/images/features/healthy-eating.jpg";
import lessWaste from "../assets/images/features/less-waste.jpg";
import seefoodLogo from "../assets/images/seefood-logo.jpg";



export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-container" id="home">

      {/* NAVBAR */}
      <header className="navbar">
      <div className="logo-container" onClick={() => navigate("/")}>
        <img 
          src={seefoodLogo} 
          alt="SeeFood Logo" 
          className="logo-img" 
        />
      </div>

      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#about">Why SeeFood</a>
        <a href="#team">Team</a>
        <a href="#contact">Contact</a>
      </div>

      <div className="nav-actions">
        <button className="login-btn-nav" onClick={() => navigate("/login")}>
          Login
        </button>
        <button className="get-started-btn" onClick={() => navigate("/signup")}>
          Get Started
        </button>
      </div>
    </header>




      {/* HERO */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>
            See Your Food. <br />
            Track Nutrition. <br />
            Cook Smarter.
          </h1>

          <p>
            SeeFood is an AI-powered app that helps you understand what you eat 
            and decide what to cook using ingredients you already have.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => navigate("/signup")}>
              Start Free
            </button>

            <button className="secondary-btn" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
      <h2>Two Smart Ways to Use SeeFood</h2>

      <div className="feature-grid">

        <div className="feature-card">
          <img src={readyMeal} alt="Ready Meals" />
          <h3>🍽 Ready Meals — Track Nutrition</h3>
          <p>
            Take a photo of your meal and instantly get calorie estimates, portion size insights,
            and nutritional breakdown — no manual input needed.
          </p>
          <button className="learn-btn">Learn More →</button>
        </div>

        <div className="feature-card">
          <img src={rawIngredients} alt="Raw Ingredients" />
          <h3>🥕 Raw Ingredients — Smart Meal Prep</h3>
          <p>
            Scan your fridge or pantry and SeeFood will suggest meals based on ingredients
            you already own, helping reduce waste and save time.
          </p>
          <button className="learn-btn">Learn More →</button>
        </div>

      </div>
    </section>

      <section className="why-section" id="about">
      <h2>Why SeeFood?</h2>

      <p className="why-intro">
        People struggle to maintain a healthy lifestyle because tracking meals and planning food is time-consuming.
        SeeFood brings both together in one simple, AI-powered platform.
      </p>

      <div className="why-grid">

        <div className="why-card">
          <img src={smartDecisions} />
          <h4>📊 Smarter food decisions</h4>
        </div>

        <div className="why-card">
          <img src={aiInsights} />
          <h4>🤖 AI-powered insights</h4>
        </div>

        <div className="why-card">
          <img src={healthyEating} />
          <h4>🍎 Healthier eating habits</h4>
        </div>

        <div className="why-card">
          <img src={lessWaste} />
          <h4>💸 Less food waste</h4>
        </div>

      </div>
    </section>


      {/* TEAM SECTION */}
      <section className="team-section" id="team">
        <h2>Meet Our Team</h2>
        <p className="team-subtitle">
          IM3180 — DESIGN & INNOVATION PROJECT GROUP IE01
        </p>

        <div className="team-grid">
          <div className="team-card">HO YIXUAN</div>
          <div className="team-card">JANICE ANGELA TEE</div>
          <div className="team-card">LEE YU YING EUNICE</div>
          <div className="team-card">SEE LI TING</div>
          <div className="team-card">YONG JUN XIONG TARENCE</div>
          <div className="team-card">MAK ZHI JUN</div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact-section" id="contact">
        <h2>Contact Us</h2>
        <p>
          Have questions or feedback? Reach out to us at{" "}
          <strong>ie01dip@e.ntu.edu.sg</strong>
        </p>

        <div className="contact-form">
          <input type="text" placeholder="Your Name" />
          <input type="email" placeholder="Your Email" />
          <textarea placeholder="Your Question"></textarea>

          <button className="primary-btn">Send Message</button>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to Eat Smarter?</h2>
        <p>Join SeeFood today and take control of your nutrition and cooking.</p>

        <button className="primary-btn" onClick={() => navigate("/signup")}>
          Create Free Account
        </button>
      </section>

      {/* FOOTER */}
      <footer className="footer">
      <div className="footer-brand">
        <img 
          src={seefoodLogo} 
          alt="SeeFood Logo" 
          className="footer-logo" 
        />
        <p>© 2026 SeeFood</p>
      </div>

      <div className="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms</a>
      </div>
    </footer>

    </div>
  );
}
