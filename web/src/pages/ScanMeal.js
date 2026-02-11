import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ScanMeal.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

export default function ScanMeal() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  const sampleResult = useMemo(
    () => ({
      name: "Chicken quinoa bowl",
      calories: 520,
      macros: { protein: 38, carbs: 54, fats: 16 },
      highlights: ["High protein", "Balanced carbs", "Good fiber"],
      suggestions: ["Add more greens for micronutrients", "Choose low-sugar sauce"],
    }),
    []
  );

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__seefood_toast_scan_meal);
    window.__seefood_toast_scan_meal = window.setTimeout(() => setToast(""), 1700);
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
      showToast("Please upload a meal photo first.");
      return;
    }
    setIsAnalyzing(true);

    // Mock delay (replace with API call later)
    await new Promise((r) => setTimeout(r, 900));

    setResult(sampleResult);
    setIsAnalyzing(false);
    showToast("Analysis complete ✅");
  }

  function saveToHistory() {
    if (!result) return showToast("Analyze a meal first.");
    showToast("Saved to history ✅");
    // Later: POST to backend then navigate("/history")
    // navigate("/history");
  }

  function goToDashboard() {
    navigate("/dashboard");
  }

  return (
    <div className="scanmeal-container">
      {/* NAVBAR */}
      <header className="scanmeal-header">
        <div className="scanmeal-brand" role="button" tabIndex={0} onClick={() => navigate("/home")}>
          <img src={seefoodLogo} alt="SeeFood logo" />
          <span>SeeFood</span>
        </div>

        <nav className="scanmeal-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate("/history")}>History</button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>Profile</button>
        </nav>

        <button className="logout-btn" onClick={() => navigate("/login")}>Log out</button>
      </header>

      <main className="scanmeal-content">
        {/* HERO */}
        <section className="scanmeal-hero">
          <div>
            <h1>Scan Meal</h1>
            <p className="subtitle">
              Upload a meal photo to estimate calories and nutrition.
            </p>
          </div>

          <div className="hero-actions">
            <button className="ghost-btn" onClick={() => navigate("/history")}>
              View history →
            </button>
          </div>
        </section>

        <section className="scanmeal-grid">
          {/* UPLOAD PANEL */}
          <div className="panel">
            <div className="panel-head">
              <h2>Upload</h2>
              <span className="pill">{file ? "1 file selected" : "No file"}</span>
            </div>

            <div className={`dropzone ${previewUrl ? "has-preview" : ""}`}>
              {previewUrl ? (
                <img className="preview" src={previewUrl} alt="Meal preview" />
              ) : (
                <div className="dropzone-inner">
                  <div className="drop-emoji">📷</div>
                  <div className="drop-title">Drop your meal photo here</div>
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
              Tip: Use a clear photo in good lighting for better results.
            </div>
          </div>

          {/* RESULT PANEL */}
          <div className="panel">
            <div className="panel-head">
              <h2>Result</h2>
              <span className="pill">{result ? "Ready" : "Waiting"}</span>
            </div>

            {!result ? (
              <div className="empty">
                <div className="empty-title">No analysis yet</div>
                <div className="empty-text">Upload a meal photo and click Analyze.</div>
              </div>
            ) : (
              <div className="result">
                <div className="result-top">
                  <div>
                    <div className="result-name">{result.name}</div>
                    <div className="result-sub">
                      Estimated: <b>{result.calories} kcal</b>
                    </div>
                  </div>
                  <span className="tag tracked">Tracked</span>
                </div>

                <div className="macro-grid">
                  <div className="macro">
                    <div className="macro-val">{result.macros.protein}g</div>
                    <div className="macro-lbl">Protein</div>
                  </div>
                  <div className="macro">
                    <div className="macro-val">{result.macros.carbs}g</div>
                    <div className="macro-lbl">Carbs</div>
                  </div>
                  <div className="macro">
                    <div className="macro-val">{result.macros.fats}g</div>
                    <div className="macro-lbl">Fats</div>
                  </div>
                </div>

                <div className="chips">
                  {result.highlights.map((h) => (
                    <span className="chip" key={h}>{h}</span>
                  ))}
                </div>

                <div className="suggestions">
                  <div className="section-label">Suggestions</div>
                  <ul>
                    {result.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-actions">
                  <button className="primary-btn" onClick={saveToHistory}>
                    Save to history
                  </button>
                  <button className="ghost-btn" onClick={goToDashboard}>
                    Go to dashboard →
                  </button>
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
