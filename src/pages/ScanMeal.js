import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ScanMeal.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function ScanMeal() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [telegramImageUrl, setTelegramImageUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  // Telegram upload flow
  const [showTelegramInput, setShowTelegramInput] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramStatus, setTelegramStatus] = useState("idle"); // idle | requesting | waiting | ready
  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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
    setPreviewUrl(URL.createObjectURL(picked));
    setTelegramImageUrl(null);
    setResult(null);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl && !telegramImageUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setTelegramImageUrl(null);
    setResult(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setTelegramStatus("idle");
    setShowTelegramInput(false);
    setTelegramUsername("");
  }

  async function analyze() {
    if (!file && !telegramImageUrl) {
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

  // --- Telegram upload flow ---

  function openTelegramFlow() {
    setShowTelegramInput(true);
    setTelegramStatus("idle");
  }

  async function requestTelegramPhoto() {
    const username = telegramUsername.trim();
    if (!username) {
      showToast("Please enter your Telegram username.");
      return;
    }

    setTelegramStatus("requesting");

    try {
      const res = await fetch(`${API_URL}/telegram/request-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: username }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to send request.");
        setTelegramStatus("idle");
        return;
      }

      const { requestId: newRequestId } = data;
      setTelegramStatus("waiting");
      showToast("📱 Check Telegram! Send a photo of your meal.");

      // Poll for photo availability
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${API_URL}/telegram/photo-status/${newRequestId}`
          );
          const statusData = await statusRes.json();

          if (statusData.status === "ready" && statusData.imageUrl) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setTelegramImageUrl(statusData.imageUrl);
            setPreviewUrl(statusData.imageUrl);
            setFile(null);
            setTelegramStatus("ready");
            setShowTelegramInput(false);
            setResult(null);
            showToast("✅ Photo received from Telegram!");
          }
        } catch (_) {
          // Continue polling on transient errors
        }
      }, 3000);
    } catch (err) {
      showToast("Failed to connect to the server.");
      setTelegramStatus("idle");
    }
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

        <button className="nav-btn" onClick={() => navigate("/login")}>Log out</button>
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
              <span className="pill">
                {file || telegramImageUrl ? "1 file selected" : "No file"}
              </span>
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

            {/* Telegram upload section */}
            {showTelegramInput ? (
              <div className="telegram-section">
                <label className="telegram-label">Your Telegram username</label>
                <div className="telegram-row">
                  <input
                    className="telegram-input"
                    type="text"
                    placeholder="@username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    disabled={telegramStatus === "waiting"}
                  />
                  <button
                    className="primary-btn"
                    onClick={requestTelegramPhoto}
                    disabled={telegramStatus === "requesting" || telegramStatus === "waiting"}
                  >
                    {telegramStatus === "waiting" ? "Waiting…" : "Request Photo"}
                  </button>
                </div>
                {telegramStatus === "waiting" && (
                  <div className="telegram-hint">
                    📱 Open Telegram and send your meal photo to the SeeFood bot.
                  </div>
                )}
              </div>
            ) : null}

            <div className="upload-actions">
              <label className="file-btn">
                Choose file
                <input type="file" accept="image/*" onChange={onPickFile} disabled={telegramStatus === "waiting"} />
              </label>

              <button className="telegram-btn" onClick={openTelegramFlow} disabled={telegramStatus === "waiting"}>
                📱 Upload from Telegram
              </button>

              <button className="ghost-btn" onClick={clearFile} disabled={!file && !telegramImageUrl && telegramStatus !== "waiting"}>
                Clear
              </button>

              <button className="primary-btn" onClick={analyze} disabled={isAnalyzing || (!file && !telegramImageUrl)}>
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
