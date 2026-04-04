import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ScanMeal.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function ScanMeal() {
  const navigate = useNavigate();

  // ── Traditional file-upload state ─────────────────────────────────────────
  const [file, setFile] = useState(null);          // File object (device upload)
  const [previewUrl, setPreviewUrl] = useState("");

  // ── Telegram upload state ──────────────────────────────────────────────────
  const [telegramUsername, setTelegramUsername] = useState(
    localStorage.getItem("seefood_telegram_username") || ""
  );
  const [telegramMode, setTelegramMode] = useState(false);         // true = using Telegram upload
  const [hasTelegramPhoto, setHasTelegramPhoto] = useState(false); // true = photo received from Telegram
  const [requestId, setRequestId] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState("idle"); // idle | requesting | waiting | completed | error
  const pollRef = useRef(null);

  // ── Shared state ───────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  const userId = useMemo(() => localStorage.getItem("seefood_user_id") || "", []);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__seefood_toast_scan_meal);
    window.__seefood_toast_scan_meal = window.setTimeout(() => setToast(""), 3000);
  }

  // ── Cleanup poll on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Traditional file pick ──────────────────────────────────────────────────
  function onPickFile(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    const url = URL.createObjectURL(picked);
    setPreviewUrl(url);
    setResult(null);
    setTelegramMode(false);
    setHasTelegramPhoto(false);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl && !telegramMode) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setResult(null);
    setTelegramMode(false);
    setHasTelegramPhoto(false);
    setTelegramStatus("idle");
    setRequestId(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  // ── Telegram username input ────────────────────────────────────────────────
  function onTelegramUsernameChange(e) {
    const val = e.target.value.trim();
    setTelegramUsername(val);
    if (val) {
      localStorage.setItem("seefood_telegram_username", val);
    } else {
      localStorage.removeItem("seefood_telegram_username");
    }
  }

  // ── Start Telegram upload flow ─────────────────────────────────────────────
  async function requestTelegramUpload() {
    const username = telegramUsername.replace(/^@/, "").trim();
    if (!username) {
      showToast("Enter your Telegram username first.");
      return;
    }

    clearFile();
    setTelegramMode(true);
    setTelegramStatus("requesting");

    try {
      const resp = await fetch(`${API_URL}/telegram/request-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: username }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `API error ${resp.status}`);
      }

      const data = await resp.json();
      setRequestId(data.requestId);
      setTelegramStatus("waiting");
      showToast("📱 Check Telegram – send a photo of your meal!");

      // Start polling every 2 seconds
      pollRef.current = setInterval(() => pollPhotoStatus(data.requestId), 2000);
    } catch (err) {
      console.error(err);
      setTelegramStatus("error");
      setTelegramMode(false);
      showToast(`Failed: ${err.message}`);
    }
  }

  // ── Poll for photo status ──────────────────────────────────────────────────
  async function pollPhotoStatus(rid) {
    try {
      const resp = await fetch(`${API_URL}/telegram/photo-status/${rid}`);
      if (!resp.ok) return;
      const data = await resp.json();

      if (data.status === "completed" && data.photoUrl) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setTelegramStatus("completed");
        setHasTelegramPhoto(true);
        setPreviewUrl(data.photoUrl);
        showToast("✅ Photo received from Telegram!");
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }

  // ── Analyze ────────────────────────────────────────────────────────────────
  async function analyze() {
    const canAnalyze = file || hasTelegramPhoto;
    if (!canAnalyze) {
      showToast("Please upload a meal photo first.");
      return;
    }
    setIsAnalyzing(true);

    try {
      let body;

      if (hasTelegramPhoto) {
        // Photo came from Telegram – send the requestId for the API to locate it
        body = { requestId };
      } else {
        // Traditional file upload – convert to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        body = { image: base64 };
      }

      if (userId) body.userId = userId;

      const resp = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setResult(data);
      showToast("Analysis complete ✅");
    } catch (err) {
      console.error(err);
      showToast("Analysis failed. Is the API running?");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("seefood_user_id");
    localStorage.removeItem("seefood_username");
    navigate("/login");
  }

  function saveToHistory() {
    if (!result) return showToast("Analyze a meal first.");
    showToast("Saved to history ✅");
    setTimeout(() => navigate("/history"), 1200);
  }

  function goToDashboard() {
    navigate("/dashboard");
  }

  // ── Derived display helpers ────────────────────────────────────────────────
  const hasPhoto = !!previewUrl;
  const canAnalyze = !!file || hasTelegramPhoto;
  const fileBadge = telegramMode
    ? telegramStatus === "waiting"
      ? "⏳ Waiting for Telegram…"
      : telegramStatus === "completed"
      ? "📱 From Telegram"
      : "No file"
    : file
    ? "1 file selected"
    : "No file";

  return (
    <div className="scanmeal-container">
      {/* NAVBAR */}
      <header className="scanmeal-header">
        <div className="scanmeal-brand" role="button" tabIndex={0} onClick={() => navigate("/home")}>
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="scanmeal-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate("/history")}>History</button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>Profile</button>
        </nav>

        <button className="nav-btn" onClick={handleLogout}>Log out</button>
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
              <span className="pill">{fileBadge}</span>
            </div>

            <div className={`dropzone ${hasPhoto ? "has-preview" : ""}`}>
              {hasPhoto ? (
                <img className="preview" src={previewUrl} alt="Meal preview" />
              ) : telegramStatus === "waiting" ? (
                <div className="dropzone-inner">
                  <div className="drop-emoji tg-spin">⏳</div>
                  <div className="drop-title">Waiting for Telegram…</div>
                  <div className="drop-text">Open Telegram and send a photo of your meal.</div>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <div className="drop-emoji">📷</div>
                  <div className="drop-title">Drop your meal photo here</div>
                  <div className="drop-text">or choose one of the upload options below</div>
                </div>
              )}
            </div>

            {/* ── Telegram Upload Section ─────────────────────────── */}
            <div className="tg-upload-section">
              <div className="tg-upload-label">
                <span className="tg-icon">✈️</span>
                <span>Upload from Telegram</span>
              </div>

              <div className="tg-input-row">
                <input
                  type="text"
                  className="tg-username-input"
                  placeholder="@your_telegram_username"
                  value={telegramUsername}
                  onChange={onTelegramUsernameChange}
                  disabled={telegramStatus === "waiting"}
                />
                <button
                  className="tg-btn"
                  onClick={requestTelegramUpload}
                  disabled={telegramStatus === "waiting" || telegramStatus === "requesting"}
                >
                  {telegramStatus === "requesting"
                    ? "Requesting…"
                    : telegramStatus === "waiting"
                    ? "Waiting…"
                    : "Request photo"}
                </button>
              </div>

              <p className="tg-hint">
                The SeeFood Telegram bot will prompt you to send a photo.
                {!telegramUsername && " Enter your Telegram username (without @) to get started."}
              </p>
            </div>

            {/* ── Divider ─────────────────────────────────────────── */}
            <div className="upload-divider"><span>or</span></div>

            {/* ── Traditional file-pick ────────────────────────────── */}
            <div className="upload-actions">
              <label className="file-btn">
                Choose file
                <input type="file" accept="image/*" onChange={onPickFile} />
              </label>

              <button className="ghost-btn" onClick={clearFile} disabled={!file && !previewUrl && !hasTelegramPhoto}>
                Clear
              </button>

              <button className="primary-btn" onClick={analyze} disabled={isAnalyzing || !canAnalyze}>
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

