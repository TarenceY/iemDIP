import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/Welcome.css";
import readyMeal from "../assets/images/features/ready-meal.jpg";
import rawIngredients from "../assets/images/features/raw-ingredients.jpg";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const HOW_STEPS = [
  {
    id: "meal-photo",
    title: "Upload meal photo",
    body: "Snap a plate with Telegram or in-app upload. No manual logging.",
    visualTitle: "Meal captured",
    visualMetric: "92% confidence",
    tone: "tone-meal"
  },
  {
    id: "nutrition-analysis",
    title: "Get nutrition analysis",
    body: "See calories, macros, and balance in a clean, instant breakdown.",
    visualTitle: "Nutrition report",
    visualMetric: "560 kcal",
    tone: "tone-nutrition"
  },
  {
    id: "ingredient-scan",
    title: "Scan ingredients",
    body: "Use what you already have to reduce waste and simplify planning.",
    visualTitle: "Fridge scan",
    visualMetric: "8 ingredients detected",
    tone: "tone-ingredients"
  },
  {
    id: "ai-guidance",
    title: "Receive AI guidance",
    body: "Get practical meal suggestions and next actions for your goals.",
    visualTitle: "AI suggestions",
    visualMetric: "3 meal ideas ready",
    tone: "tone-guidance"
  }
];

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, ease: "easeOut" }
};

export default function Welcome() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(HOW_STEPS[0].id);
  const stepsRef = useRef([]);
  const tickingRef = useRef(false);
  const activeVisual = useMemo(
    () => HOW_STEPS.find((step) => step.id === activeStep) || HOW_STEPS[0],
    [activeStep]
  );

  useEffect(() => {
    const nodes = stepsRef.current.filter(Boolean);
    if (!nodes.length) return undefined;

    const updateActiveStep = () => {
      const viewportAnchor = window.innerHeight * 0.45;
      let closestStepId = HOW_STEPS[0].id;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportAnchor);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestStepId = node.dataset.stepId;
        }
      }

      if (!closestStepId) return;
      setActiveStep((prev) => (prev === closestStepId ? prev : closestStepId));
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        updateActiveStep();
        tickingRef.current = false;
      });
    };

    updateActiveStep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="welcome-container" id="home">
      <header className="navbar">
        <div className="logo-container" onClick={() => navigate("/")}>
          <img src={seefoodLogo} alt="SeeFood Logo" className="logo-img" />
        </div>
        <div className="nav-links">
          <a href="#problem">Why it matters</a>
          <a href="#how-it-works">How it works</a>
          <a href="#spotlight">Features</a>
        </div>
        <div className="nav-actions">
          <button className="login-btn-nav" onClick={() => navigate("/login")}>
            Log In
          </button>
          <button className="get-started-btn" onClick={() => navigate("/signup")}>
            Get Started
          </button>
        </div>
      </header>

      <section className="chapter chapter-hero hero-shell">
        <motion.div className="hero-grid" {...reveal}>
          <div className="hero-copy">
            <span className="eyebrow">Try Seefood</span>
            <h1>Eat smarter with a single photo.</h1>
            <p>
              SeeFood turns meal photos and ingredient scans into clear nutrition
              insights and practical guidance you can follow daily.
            </p>
            <div className="hero-cta-row">
              <button className="primary-btn hero-primary" onClick={() => navigate("/signup")}>
                Get Started
              </button>
              <button className="secondary-btn" onClick={() => navigate("/login")}>
                See Demo Flow
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <img src={readyMeal} alt="SeeFood meal scan preview" />
            <div className="hero-float hero-float-top">
              <span>Meal scan</span>
              <strong>560 kcal</strong>
            </div>
            <div className="hero-float hero-float-bottom">
              <span>Macro balance</span>
              <strong>Protein +24g</strong>
            </div>
          </div>
        </motion.div>
      </section>
      <section className="chapter chapter-problem chapter-overlap problem-section" id="problem">
        <div className="problem-layout chapter-inner">
          <motion.div className="problem-copy" {...reveal}>
            <span className="eyebrow">Why SeeFood</span>
            <h2>Healthy eating breaks when tracking feels like homework.</h2>
            <p>
              Most people do not need more nutrition theory. They need a faster
              system that fits real routines and keeps decisions simple.
            </p>
          </motion.div>
          <div className="problem-grid">
            <FeatureCard
              title="Tracking is tedious"
              text="Manual calorie logging takes too long, so consistency drops quickly."
            />
            <FeatureCard
              title="Ingredients go to waste"
              text="Food gets forgotten in the fridge without a quick way to turn it into meals."
              featured
            />
            <FeatureCard
              title="Choices feel noisy"
              text="You need clear, personalized guidance instead of generic diet advice."
            />
          </div>
        </div>
      </section>

      <section className="chapter chapter-how chapter-overlap how-section" id="how-it-works">
        <div className="section-intro chapter-inner">
          <span className="eyebrow">How it works</span>
          <h2>Scroll through one flow from photo to guidance.</h2>
        </div>
        <div className="how-layout chapter-inner">
          <div className="how-sticky">
            <motion.div
              className={`how-visual ${activeVisual.tone}`}
              initial={{ opacity: 0.4, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HowStepVisual activeVisual={activeVisual} />
            </motion.div>
          </div>
          <div className="how-steps">
            {HOW_STEPS.map((step, index) => (
              <motion.article
                key={step.id}
                className={`how-step ${activeStep === step.id ? "active" : ""}`}
                data-step-id={step.id}
                ref={(node) => {
                  stepsRef.current[index] = node;
                }}
                initial={{ opacity: 0.45, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.55 }}
                transition={{ duration: 0.35 }}
              >
                <p className="step-index">0{index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="chapter chapter-spotlight chapter-overlap spotlight-section" id="spotlight">
        <div className="telegram-layout chapter-inner">
          <motion.div className="telegram-copy" {...reveal}>
            <span className="eyebrow">Telegram Bot Spotlight</span>
            <h2>Upload meals in chat. Get nutrition feedback instantly.</h2>
            <p>
              No app friction. Send your meal in Telegram and SeeFood responds with
              calories, macro balance, and next-step guidance.
            </p>
          </motion.div>
          <motion.div className="telegram-visual" {...reveal}>
            <div className="chat-shell">
              <div className="chat-head">@SeeFood Bot</div>
              <div className="chat-row user">Here is my lunch.</div>
              <div className="chat-image">
                <img src={readyMeal} alt="Telegram meal upload" />
              </div>
              <div className="chat-row bot">Detected meal. Estimated 560 kcal.</div>
              <div className="chat-row bot">Protein 24g • Carbs 56g • Fat 18g</div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="chapter chapter-benefits chapter-overlap benefits-section">
        <div className="benefits-inner chapter-inner">
          <motion.div className="benefits-head" {...reveal}>
            <span className="eyebrow">Outcomes</span>
            <h2>SeeFood helps users eat with clarity, speed, and less waste.</h2>
          </motion.div>
          <div className="benefits-grid">
            <BenefitBlock
              title="Eat with more awareness"
              text="See nutrition impact immediately after each meal."
            />
            <BenefitBlock
              title="Waste less food"
              text="Turn available ingredients into practical meal options."
            />
            <BenefitBlock
              title="Decide faster"
              text="Replace decision fatigue with guided meal suggestions."
            />
          </div>
        </div>
      </section>

      <section className="chapter chapter-cta chapter-overlap final-cta">
        <motion.div className="final-cta-inner chapter-inner" {...reveal}>
          <span className="eyebrow">Start now</span>
          <h2>Try Seefood and make every meal decision easier.</h2>
          <button className="primary-btn final-cta-btn" onClick={() => navigate("/signup")}>
            Create your free account
          </button>
        </motion.div>
      </section>

      <footer className="footer">
        <div className="footer-brand">
          <img src={seefoodLogo} alt="SeeFood Logo" className="footer-logo" />
          <p>© 2026 SeeFood</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, text, featured = false }) {
  return (
    <motion.article className={`problem-card ${featured ? "featured" : ""}`} {...reveal}>
      <h3>{title}</h3>
      <p>{text}</p>
    </motion.article>
  );
}

function BenefitBlock({ title, text }) {
  return (
    <motion.article
      className="benefit-block"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <h3>{title}</h3>
      <p>{text}</p>
    </motion.article>
  );
}

function HowStepVisual({ activeVisual }) {
  if (activeVisual.id === "meal-photo") {
    return (
      <div className="mockup phone-upload">
        <div className="mockup-topbar">
          <span>Upload meal</span>
          <strong>Camera</strong>
        </div>
        <div className="mockup-media">
          <img src={readyMeal} alt="Meal upload screen" />
        </div>
        <div className="mockup-actions">
          <button>Retake</button>
          <button className="mockup-primary">Analyze</button>
        </div>
      </div>
    );
  }

  if (activeVisual.id === "nutrition-analysis") {
    return (
      <div className="mockup phone-analysis">
        <div className="mockup-topbar">
          <span>Nutrition report</span>
          <strong>{activeVisual.visualMetric}</strong>
        </div>
        <div className="macro-bars">
          <MacroMini label="Protein" value="24g" pct={78} />
          <MacroMini label="Carbs" value="56g" pct={62} />
          <MacroMini label="Fat" value="18g" pct={44} />
        </div>
        <div className="insight-note">Balanced meal, high protein density.</div>
      </div>
    );
  }

  if (activeVisual.id === "ingredient-scan") {
    return (
      <div className="mockup phone-fridge">
        <div className="mockup-topbar">
          <span>Fridge scan</span>
          <strong>{activeVisual.visualMetric}</strong>
        </div>
        <div className="mockup-media">
          <img src={rawIngredients} alt="Ingredient scan screen" />
        </div>
        <div className="chip-grid">
          <span>Tomato</span>
          <span>Eggs</span>
          <span>Spinach</span>
          <span>Onion</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mockup phone-guidance">
      <div className="mockup-topbar">
        <span>AI meal suggestions</span>
        <strong>{activeVisual.visualMetric}</strong>
      </div>
      <div className="suggestion-list">
        <article>
          <h4>15-min veggie egg bowl</h4>
          <p>412 kcal · high protein</p>
        </article>
        <article>
          <h4>Tomato spinach stir-fry</h4>
          <p>355 kcal · low waste</p>
        </article>
        <article>
          <h4>Balanced dinner plan</h4>
          <p>Targets your daily macro goals</p>
        </article>
      </div>
    </div>
  );
}

function MacroMini({ label, value, pct }) {
  return (
    <div className="macro-mini">
      <div className="macro-mini-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="macro-mini-track">
        <div className="macro-mini-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
