// app.js
require("dotenv").config();
console.log("Starting server...");

const recipeRoutes = require("./routes/recipes");
const express = require("express");
const cors = require("cors");
const app = express();

// Allow requests from the React frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

// Load MongoDB connection
const db = require("./database");
const User = require("./models/User");
const PhotoRequest = require("./models/PhotoRequest");
const NutritionLog = require("./models/NutritionLog");

// Allow the React webapp (localhost:3000) to call this API
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
app.use("/api/recipes", recipeRoutes);

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const telegramRoutes = require("./routes/telegram");
app.use("/telegram", telegramRoutes);

const rateLimit = require("express-rate-limit");
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { message: "Too many analyze requests. Please try again shortly." },
});

const PORT = process.env.PORT || 3000;

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Health check
app.get("/health", (req, res) => {
  const mongoStatus = db.readyState === 1 ? "connected" : "disconnected";

  res.json({
    status: "ok",
    mongoDB: mongoStatus,
    timestamp: new Date(),
  });
});

// ---------------------------------------------------------------------------
// AI Integration helpers
// ---------------------------------------------------------------------------

/**
 * Send an image buffer to the Python AI service and return the raw response.
 * @param {Buffer} imageBuffer  Raw image bytes
 * @param {string} mimeType     MIME type of the image (e.g. "image/jpeg")
 * @returns {Promise<object>}   Parsed JSON from the AI service
 */
async function callAIService(imageBuffer, mimeType = "image/jpeg") {
  const aiApiUrl = process.env.AI_API_URL || "http://localhost:8000";

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append("image", blob, "meal.jpg");
  formData.append("include_annotated", "false");

  const response = await fetch(`${aiApiUrl}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI service error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Transform the AI service response into the shape the React frontend expects.
 * @param {object} aiData  Response body from the Python AI service
 * @returns {object}       { name, calories, macros, highlights, suggestions }
 */
function transformAIResponse(aiData) {
  const nutrition = aiData.nutrition || {};
  const totals = nutrition.totals || {};
  const foodItems = nutrition.food_items || [];

  // Meal name: join detected food item names
  const foodNames = foodItems.map((item) => item.food_name).filter(Boolean);
  const name = foodNames.length > 0 ? foodNames.join(", ") : "Detected meal";

  const calories = Math.round(totals.calories || 0);
  const protein = Math.round(totals.protein_g || 0);
  const carbs = Math.round(totals.carbohydrates_g || 0);
  const fats = Math.round(totals.fat_g || 0);

  // Generate highlights from macro values
  const highlights = [];
  if (protein >= 25) highlights.push("High protein");
  else if (protein >= 15) highlights.push("Good protein");
  if (fats <= 10) highlights.push("Low fat");
  if (carbs <= 30) highlights.push("Low carb");
  if (calories <= 400) highlights.push("Low calorie");
  if (highlights.length === 0) highlights.push("Balanced meal");

  // Parse suggestions from the AI analysis notes
  const notes = nutrition.analysis_notes || "";
  const suggestions = notes
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 3);
  if (suggestions.length === 0) suggestions.push("Enjoy your meal!");

  return { name, calories, macros: { protein, carbs, fats }, highlights, suggestions };
}

/**
 * Save nutrition analysis data into NutritionLog documents.
 * @param {string} userId
 * @param {object} aiData
 */
async function saveNutritionLogs(userId, aiData) {
  if (!userId || !aiData || !aiData.nutrition) return;

  const nutrition = aiData.nutrition;
  const backendData = nutrition.backend_data || {};
  const backendItems = Array.isArray(backendData.items) ? backendData.items : [];
  const totals = nutrition.totals || {};

  const logsToInsert = backendItems.length > 0
    ? backendItems.map((item) => ({
        user_id: String(userId),
        log_date: new Date(),
        food_name: item.food_name || "Detected meal",
        calories: Number(item.calories || 0),
        carbs: Number(item.carbs || 0),
        protein: Number(item.protein || 0),
        fats: Number(item.fats || 0),
        fiber: Number(item.fiber || 0),
        sodium: Number(item.sodium || 0),
        notes: item.notes || nutrition.analysis_notes || "",
      }))
    : [{
        user_id: String(userId),
        log_date: new Date(),
        food_name: "Detected meal",
        calories: Number(totals.calories || 0),
        carbs: Number(totals.carbohydrates_g || 0),
        protein: Number(totals.protein_g || 0),
        fats: Number(totals.fat_g || 0),
        fiber: 0,
        sodium: 0,
        notes: nutrition.analysis_notes || "",
      }];

  await NutritionLog.insertMany(logsToInsert);
}

/**
 * Fetch the image bytes for a Telegram photo request.
 * @param {string} requestId  UUID of the photo request
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function fetchTelegramPhoto(requestId) {
  const doc = await PhotoRequest.findOne({ requestId, status: "completed" });
  if (!doc || !doc.photoUrl) {
    throw new Error("Photo not found or not yet uploaded.");
  }

  // Fetch from the photo URL (S3 or local API endpoint)
  const response = await fetch(doc.photoUrl);
  if (!response.ok) throw new Error(`Failed to fetch photo: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: "image/jpeg" };
}

// ---------------------------------------------------------------------------
// POST /analyze
//
// Accepts a meal photo and returns AI nutritional analysis.
// Supports two content types:
//   - application/json: { image: "<base64>", userId: "<optional>", chatId: "<optional>" }
//   - application/json: { requestId: "<uuid>", userId: "<optional>" }  (Telegram upload)
//   - application/octet-stream: raw image bytes (sent by the Telegram bot)
//
// If a chatId (or the userId's linked telegramChatId) is available and TELEGRAM_TOKEN
// is set in the environment, the result is also sent to the user via Telegram.
// ---------------------------------------------------------------------------
app.post("/analyze", analyzeLimiter, async (req, res) => {
  let imageBuffer;
  let mimeType = "image/jpeg";

  try {
    if (Buffer.isBuffer(req.body)) {
      // Raw bytes sent by the Telegram bot
      imageBuffer = req.body;
    } else if (req.body && req.body.requestId) {
      // Telegram photo upload flow – locate the stored image
      const { buffer, mimeType: mt } = await fetchTelegramPhoto(req.body.requestId);
      imageBuffer = buffer;
      mimeType = mt;
    } else if (req.body && req.body.image) {
      // Base64-encoded image from the webapp
      imageBuffer = Buffer.from(req.body.image, "base64");
    } else {
      return res.status(400).json({ message: "No image provided." });
    }
  } catch (err) {
    console.error("Image retrieval error:", err.message);
    return res.status(400).json({ message: err.message || "Failed to retrieve image." });
  }

  // Call the AI service
  let result;
  let aiData;
  try {
    aiData = await callAIService(imageBuffer, mimeType);
    if (!aiData.success) {
      return res.status(502).json({
        message: aiData.error || "AI analysis returned no results. Please try again with a clearer image.",
      });
    }
    result = transformAIResponse(aiData);
  } catch (err) {
    console.error("AI analysis error:", err.message);
    return res.status(502).json({
      message: "AI analysis service is unavailable. Please ensure the AI server is running.",
      detail: err.message,
    });
  }

  // Persist logs for users when userId is provided by webapp or bot flow.
  if (req.body && req.body.userId) {
    try {
      await saveNutritionLogs(req.body.userId, aiData);
    } catch (err) {
      console.error("Failed to save nutrition logs:", err.message);
    }
  }

  // Determine chat ID to notify via Telegram
  let chatId = null;
  if (req.body && req.body.chatId) {
    chatId = req.body.chatId;
  } else if (req.body && req.body.userId) {
    try {
      const user = await User.findById(req.body.userId).select("telegramChatId");
      if (user && user.telegramChatId) chatId = user.telegramChatId;
    } catch (_) {
      // Non-fatal – proceed without Telegram notification
    }
  }

  // Send Telegram notification if we have a chat ID and bot token
  const token = process.env.TELEGRAM_TOKEN;
  if (chatId && token) {
    const text =
      `📊 *Meal Analysis* (from webapp)\n\n` +
      `🍽️ *${result.name}*\n` +
      `🔥 ${result.calories} kcal\n\n` +
      `*Macros:*\n` +
      `• Protein: ${result.macros.protein}g\n` +
      `• Carbs: ${result.macros.carbs}g\n` +
      `• Fats: ${result.macros.fats}g\n\n` +
      `*Highlights:* ${result.highlights.join(", ")}\n` +
      `*Suggestions:* ${result.suggestions.join("; ")}`;

    const payload = JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" });
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    };

    const telegramReq = https.request(options);
    telegramReq.on("error", (err) => {
      console.error("Telegram notification failed:", err.message);
    });
    telegramReq.write(payload);
    telegramReq.end();
  }

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
