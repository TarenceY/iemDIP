import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ScanIngredients.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function ScanIngredients() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  const sampleResult = useMemo(
    () => ({
      detected: ["Eggs", "Milk", "Spinach", "Cherry tomatoes", "Bread"],
      recipes: [
        {
          id: "r1",
          title: "Spinach omelette",
          desc: "Quick protein breakfast using eggs + spinach.",
          missing: ["Cheese (optional)"],
        },
        {
          id: "r2",
          title: "Tomato egg toast",
          desc: "Simple snack with eggs + tomatoes on bread.",
          missing: ["Butter"],
        },
        {
          id: "r3",
          title: "Creamy spinach scramble",
          desc: "Soft scramble using milk + spinach.",
          missing: ["Onion", "Garlic"],
        },
      ],
    }),
    []
  );

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__seefood_toast_scan_ing);
    window.__seefood_toast_scan_ing = window.setTimeout(() => setToast(""), 1700);
  }

  function onPickFile(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setFile(picked);
    const url = URL.createObjectURL(picked);
    setPreviewUrl(url);
    setResult(null);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setResult(null);
  }

  async function analyze() {
    if (!file) {
      showToast("Please upload a fridge photo first.");
      return;
    }
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 900));
    setResult(sampleResult);
    setIsAnalyzing(false);
    showToast("Ingredients detected ✅");
  }

  function savePlannedMeal(recipe) {
    if (!result) return showToast("Analyze ingredients first.");
    showToast(`Saved "${recipe.title}" to history ✅`);
    // Later: POST planned meal to backend
  }

  function addMissingToGrocery(recipe) {
    if (!result) return showToast("Analyze ingredients first.");
    const count = recipe.missing.length;
    showToast(count ? `Added ${count} missing item(s) ✅` : "Nothing missing 🎉");
    // Later: Add to grocery list state / backend
  }

  return (
    <div className="scaning-container">
      {/* NAVBAR */}
      <header className="scaning-header">
        <div className="scaning-brand" role="button" tabIndex={0} onClick={() => navigate("/home")}>
          <img src={seefoodLogo} alt="SeeFood logo" />
          <span>SeeFood</span>
        </div>

        <nav className="scaning-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate("/history")}>History</button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>Profile</button>
        </nav>

        <button className="nav-btn" onClick={() => navigate("/login")}>Log out</button>
      </header>

      <main className="scaning-content">
        {/* HERO */}
        <section className="scaning-hero">
          <div>
            <h1>Scan Ingredients</h1>
            <p className="subtitle">
              Upload a fridge photo to detect ingredients and get meal ideas.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-btn" onClick={() => navigate("/dashboard")}>
              Go to dashboard →
            </button>
          </div>
        </section>

        <section className="scaning-grid">
          {/* UPLOAD PANEL */}
          <div className="panel">
            <div className="panel-head">
              <h2>Upload</h2>
              <span className="pill">{file ? "1 file selected" : "No file"}</span>
            </div>

            <div className={`dropzone ${previewUrl ? "has-preview" : ""}`}>
              {previewUrl ? (
                <img className="preview" src={previewUrl} alt="Fridge preview" />
              ) : (
                <div className="dropzone-inner">
                  <div className="drop-emoji">🧊</div>
                  <div className="drop-title">Drop your fridge photo here</div>
                  <div className="drop-text">or choose a file from your device</div>
                </div>
              )}
            </div>

            <div className="upload-actions">
              <label className="file-btn">
                Choose file
                <input type="file" accept="image/*" onChange={onPickFile} />
              </label>

              <button className="ghost-btn" onClick={clearFile} disabled={!file}>
                Clear
              </button>

              <button className="primary-btn" onClick={analyze} disabled={isAnalyzing || !file}>
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            <div className="hint">
              Tip: Open the fridge door fully and take a wide photo for better detection.
            </div>
          </div>

          {/* RESULTS PANEL */}
          <div className="panel">
            <div className="panel-head">
              <h2>Suggestions</h2>
              <span className="pill">{result ? "Ready" : "Waiting"}</span>
            </div>

            {!result ? (
              <div className="empty">
                <div className="empty-title">No results yet</div>
                <div className="empty-text">Upload a fridge photo and click Analyze.</div>
              </div>
            ) : (
              <div className="result">
                <div className="section-label">Detected ingredients</div>
                <div className="chips">
                  {result.detected.map((d) => (
                    <span className="chip" key={d}>{d}</span>
                  ))}
                </div>

                <div className="section-label" style={{ marginTop: 12 }}>
                  Meal ideas
                </div>

                <div className="recipe-list">
                  {result.recipes.map((r) => (
                    <article className="recipe-card" key={r.id}>
                      <div className="recipe-top">
                        <div>
                          <div className="recipe-title">{r.title}</div>
                          <div className="recipe-desc">{r.desc}</div>
                        </div>
                        <span className="tag planned">Planned</span>
                      </div>

                      <div className="missing">
                        <div className="missing-label">Missing items</div>
                        <div className="missing-chips">
                          {r.missing.length === 0 ? (
                            <span className="chip">Nothing 🎉</span>
                          ) : (
                            r.missing.map((m) => <span className="chip" key={m}>{m}</span>)
                          )}
                        </div>
                      </div>

                      <div className="recipe-actions">
                        <button className="primary-btn" onClick={() => savePlannedMeal(r)}>
                          Save to history
                        </button>
                        <button className="ghost-btn" onClick={() => addMissingToGrocery(r)}>
                          + Add missing to grocery
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}
