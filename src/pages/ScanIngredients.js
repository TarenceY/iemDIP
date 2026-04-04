import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ScanIngredients.css";
import seefoodLogo from "../assets/images/seefood-logo.jpg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function ScanIngredients() {
  const navigate = useNavigate();

  // ── Traditional file-upload state ─────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // ── Telegram upload state ──────────────────────────────────────────────────
  const [telegramUsername, setTelegramUsername] = useState(
    localStorage.getItem("seefood_telegram_username") || ""
  );
  const [telegramMode, setTelegramMode] = useState(false);
  const [hasTelegramPhoto, setHasTelegramPhoto] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState("idle"); // idle | requesting | waiting | completed | error
  const pollRef = useRef(null);

  // ── Shared state ───────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__seefood_toast_scan_ing);
    window.__seefood_toast_scan_ing = window.setTimeout(() => setToast(""), 2500);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
    setRequestId(null);
    setTelegramStatus("idle");

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function onTelegramUsernameChange(e) {
    const val = e.target.value.trim();
    setTelegramUsername(val);
    if (val) {
      localStorage.setItem("seefood_telegram_username", val);
    } else {
      localStorage.removeItem("seefood_telegram_username");
    }
  }

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
      showToast("📱 Check Telegram – send a fridge photo!");

      pollRef.current = setInterval(() => pollPhotoStatus(data.requestId), 2000);
    } catch (err) {
      console.error(err);
      setTelegramStatus("error");
      setTelegramMode(false);
      showToast(`Failed: ${err.message}`);
    }
  }

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

  async function analyze() {
    const canAnalyze = file || hasTelegramPhoto;
    if (!canAnalyze) {
      showToast("Please upload a fridge photo first.");
      return;
    }

    setIsAnalyzing(true);

    try {
      let body;

      if (hasTelegramPhoto) {
        body = { requestId };
      } else {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => reject(new Error("Failed to read image file"));
          reader.readAsDataURL(file);
        });
        body = { image: base64 };
      }

      const resp = await fetch(`${API_URL}/analyze-ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setResult(data);
      showToast("Ingredients detected ✅");
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

  async function savePlannedMeal(recipe) {
    if (!result) return showToast("Analyze ingredients first.");
    const userId = localStorage.getItem("seefood_user_id");
    if (!userId) return showToast("Log in to save to history.");

    try {
      const resp = await fetch(`${API_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          foodName: recipe.title,
          notes: recipe.desc,
          type: "planned",
          ingredients: result.detected,
        }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      showToast(`Saved "${recipe.title}" to history ✅`);
    } catch {
      showToast("Failed to save. Is the API running?");
    }
  }

  function addMissingToGrocery(recipe) {
    if (!result) return showToast("Analyze ingredients first.");
    const count = recipe.missing.length;
    showToast(count ? `Added ${count} missing item(s) ✅` : "Nothing missing 🎉");
  }

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
    <div className="scaning-container">
      <header className="scaning-header">
        <div
          className="scaning-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/home");
          }}
        >
          <img src={seefoodLogo} alt="SeeFood logo" />
        </div>

        <nav className="scaning-nav">
          <button className="nav-btn" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="nav-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="nav-btn" onClick={() => navigate("/history")}>
            History
          </button>
          <button className="nav-btn" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="scaning-content">
        <section className="scaning-hero">
          <div className="scaning-hero-copy">
            <p className="hero-kicker">FRIDGE SCAN</p>
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
              <span className="pill">{fileBadge}</span>
            </div>

            <div className={`dropzone ${hasPhoto ? "has-preview" : ""}`}>
              {hasPhoto ? (
                <img className="preview" src={previewUrl} alt="Fridge preview" />
              ) : telegramStatus === "waiting" ? (
                <div className="dropzone-inner">
                  <div className="drop-emoji tg-spin">⏳</div>
                  <div className="drop-title">Waiting for Telegram…</div>
                  <div className="drop-text">Open Telegram and send a photo of your fridge.</div>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <div className="drop-emoji">🧊</div>
                  <div className="drop-title">Drop your fridge photo here</div>
                  <div className="drop-text">or choose one of the upload options below</div>
                </div>
              )}
            </div>

            {/* Telegram Upload */}
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

            <div className="upload-divider">
              <span>or</span>
            </div>

            <div className="upload-actions">
              <label className="file-btn">
                Choose file
                <input type="file" accept="image/*" onChange={onPickFile} />
              </label>

              <button
                className="ghost-btn"
                onClick={clearFile}
                disabled={!file && !previewUrl && !hasTelegramPhoto}
              >
                Clear
              </button>

              <button className="primary-btn" onClick={analyze} disabled={isAnalyzing || !canAnalyze}>
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            <div className="hint">
              Tip: Open the fridge door fully and take a wide photo for better detection.
            </div>
          </div>

          {/* RESULT PANEL */}
          <div className="panel">
            <div className="panel-head">
              <h2>Detected Ingredients</h2>
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
                    <span className="chip" key={d}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RECIPE PANEL */}
        <section className="scaning-recipes-panel panel">
          <div className="panel-head">
            <h2>Recommended Recipes</h2>
            <span className="pill">{result ? `${result.recipes.length} ideas` : "Waiting"}</span>
          </div>

          {!result ? (
            <div className="empty">
              <div className="empty-title">No recipes yet</div>
              <div className="empty-text">Analyze your ingredients first to see meal ideas.</div>
            </div>
          ) : (
            <div className="recipe-list">
              {result.recipes.map((r) => (
                <article className="recipe-card" key={r.id}>
                  <div className="recipe-top">
                    <div>
                      <div className="recipe-title">{r.title}</div>
                      <div className="recipe-desc">{r.desc}</div>
                    </div>
                    <span className="tag planned">Recommended</span>
                  </div>

                  <div className="missing">
                    <div className="missing-label">Missing items</div>
                    <div className="missing-chips">
                      {r.missing.length === 0 ? (
                        <span className="chip">Nothing 🎉</span>
                      ) : (
                        r.missing.map((m) => (
                          <span className="chip" key={m}>
                            {m}
                          </span>
                        ))
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
          )}
        </section>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}
