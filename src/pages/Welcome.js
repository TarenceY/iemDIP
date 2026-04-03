import "../styles/Welcome.css";
import { useNavigate } from "react-router-dom";
import readyMeal from "../assets/images/features/ready-meal.jpg";
import rawIngredients from "../assets/images/features/raw-ingredients.jpg";
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
        <div className="section-head">
          <span className="section-kicker">Features</span>
          <h2>
            Two Smart Ways to Use <span className="accent">SeeFood</span>
          </h2>
          <p className="section-subtitle">
            Snap a photo for nutrition insights or scan ingredients to generate meals instantly.
          </p>
        </div>

        <div className="feature-grid">

          <div className="feature-card">
            <div className="feature-media">
              <img src={readyMeal} alt="Ready Meals" />
              <span className="feature-pill">Most Popular</span>
            </div>

            <h3>Ready Meals</h3>
            <p>
              Take a photo of your meal and instantly get calorie estimates, portion size insights,
              and a detailed nutritional breakdown.
            </p>

            <button className="learn-btn" onClick={() => navigate("/learn-ready")}>
              Learn More <span aria-hidden>→</span>
            </button>
          </div>

          <div className="feature-card">
            <div className="feature-media">
              <img src={rawIngredients} alt="Raw Ingredients" />
              <span className="feature-pill alt">Smart Planning</span>
            </div>

            <h3>Raw Ingredients</h3>
            <p>
              Scan your fridge or pantry and SeeFood suggests meals based on what you already own,
              helping reduce waste and save time.
            </p>

            <button className="learn-btn" onClick={() => navigate("/learn-raw")}>
              Learn More <span aria-hidden>→</span>
            </button>
          </div>

        </div>
      </section>

      <section className="why-section" id="about">
        <div className="section-head">
          <span className="section-kicker">Why</span>
          <h2>
            Why <span className="accent">SeeFood</span>?
          </h2>
          <p className="why-intro">
            Maintaining a healthy lifestyle is difficult when meal tracking and planning are time-consuming.
            SeeFood combines both into one streamlined AI-powered experience.
          </p>
        </div>

        <div className="why-grid">

          <div className="why-card">
            <div className="why-icon">01</div>
            <h4>Smarter Decisions</h4>
            <p>Understand your meals instantly with clear visual feedback.</p>
          </div>

          <div className="why-card">
            <div className="why-icon">02</div>
            <h4>AI-Powered Insights</h4>
            <p>Automated analysis without manual calorie logging.</p>
          </div>

          <div className="why-card">
            <div className="why-icon">03</div>
            <h4>Healthier Habits</h4>
            <p>Build sustainable routines with simple, consistent tracking.</p>
          </div>

          <div className="why-card">
            <div className="why-icon">04</div>
            <h4>Less Waste</h4>
            <p>Use ingredients efficiently and reduce unnecessary purchases.</p>
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
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms</a>
      </div>
    </footer>

    </div>
  );
}