// app.js
require("dotenv").config();
console.log("Starting server...");

const express = require("express");
const https = require("https");
const app = express();

// Load MongoDB connection
const db = require("./database");

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

/**
 * POST /analyze
 *
 * Accepts a meal photo and returns mock nutritional analysis.
 * Supports two content types:
 *   - application/json: { image: "<base64>", userId: "<optional>", chatId: "<optional>" }
 *   - application/octet-stream: raw image bytes (sent by the Telegram bot)
 *
 * If a chatId (or the userId's linked telegramChatId) is available and TELEGRAM_TOKEN
 * is set in the environment, the result is also sent to the user via Telegram.
 */
app.post("/analyze", analyzeLimiter, async (req, res) => {
  // Mock nutrition result – replace with real model call when available
  const result = {
    name: "Detected meal",
    calories: 520,
    macros: { protein: 38, carbs: 54, fats: 16 },
    highlights: ["High protein", "Balanced carbs", "Good fiber"],
    suggestions: ["Add more greens for micronutrients", "Choose low-sugar sauce"],
  };

  // Determine chat ID to notify
  let chatId = null;
  if (Buffer.isBuffer(req.body)) {
    // Request came from the Telegram bot – no webapp chatId needed
  } else if (req.body && req.body.chatId) {
    chatId = req.body.chatId;
  } else if (req.body && req.body.userId) {
    // Look up the user's linked Telegram chat ID from the database
    try {
      const User = require("./models/User");
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
