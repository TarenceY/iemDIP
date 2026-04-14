// app.js
require("dotenv").config();
console.log("Starting server...");

const https = require("https");
const recipeRoutes = require("./routes/recipes");
const express = require("express");
const cors = require("cors");
const app = express();

// Allow requests from the React frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Load MongoDB connection
const db = require("./database");
const User = require("./models/User");
const PhotoRequest = require("./models/PhotoRequest");
const NutritionLog = require("./models/NutritionLog");

app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
app.use("/api/recipes", recipeRoutes);

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const telegramRoutes = require("./routes/telegram");
app.use("/telegram", telegramRoutes);

const logsRoutes = require("./routes/logs");
app.use("/logs", logsRoutes);

const groceryRoutes = require("./routes/grocery");
app.use("/grocery", groceryRoutes);

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
 * @returns {object}       { name, calories, macros, highlights, food_items }
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

  return { 
    name, 
    calories, 
    macros: { protein, carbs, fats }, 
    highlights,
    food_items: foodItems
  };
}

/**
 * Save one combined nutrition log entry for a meal analysis.
 * @param {string} userId
 * @param {object} result  Output of transformAIResponse()
 */
async function saveNutritionLogs(userId, result) {
  if (!userId || !result) return;

  await NutritionLog.create({
    user_id: String(userId),
    log_date: new Date(),
    food_name: result.name,
    calories: result.calories,
    carbs: result.macros.carbs,
    protein: result.macros.protein,
    fats: result.macros.fats,
    highlights: result.highlights || [],
    type: "tracked",
  });
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

/**
 * Get meal advice from the Python AI service.
 * @param {object} mealData  { name, calories, protein, carbs, fats, fiber, sodium }
 * @param {string} userId    User ID to fetch profile and daily targets
 * @returns {Promise<object>} MealAdvice data { verdict, justification, tips, analysis_notes, notes, ... }
 */
async function getMealAdvice(mealData, userId) {
  const aiApiUrl = process.env.AI_API_URL || "http://localhost:8000";

  try {
    // Fetch user profile and daily totals from MongoDB if userId provided
    let userProfile = {};
    let dailyTotals = {};
    let dailyTargets = {};

    if (userId) {
      const user = await User.findById(userId).select("age gender goals restrictions dislikes");
      if (user) {
        userProfile = {
          age: user.age || 25,
          gender: user.gender || "Not specified",
          goals: user.goals || [],
          restrictions: user.restrictions || [],
          dislikes: user.dislikes || []
        };
      }

      // Get today's nutrition totals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const logs = await NutritionLog.find({
        user_id: String(userId),
        log_date: { $gte: today }
      });

      dailyTotals = {
        total_calories: logs.reduce((sum, log) => sum + (log.calories || 0), 0),
        total_protein_g: logs.reduce((sum, log) => sum + (log.protein || 0), 0),
        total_carbs_g: logs.reduce((sum, log) => sum + (log.carbs || 0), 0),
        total_fats_g: logs.reduce((sum, log) => sum + (log.fats || 0), 0),
        total_sodium_mg: logs.reduce((sum, log) => sum + (log.sodium || 0), 0),
        meals_count: logs.length
      };

      // Get user's daily targets (from profile or defaults)
      dailyTargets = {
        calories: user.daily_calorie_target || 2000,
        protein_g: user.daily_protein_target || 50,
        carbs_g: user.daily_carbs_target || 300,
        fats_g: user.daily_fats_target || 65,
        sodium_mg: user.daily_sodium_target || 2300
      };
    }

    const payload = {
      user_profile: userProfile,
      meal_data: mealData,
      daily_totals: dailyTotals,
      daily_targets: dailyTargets
    };

    const response = await fetch(`${aiApiUrl}/api/meal-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Meal advice service error ${response.status}: ${text}`);
    }

    const mealAdviceData = await response.json();
    console.log("Meal advice response:", JSON.stringify(mealAdviceData, null, 2));
    
    // Unwrap the advice from the response structure
    if (mealAdviceData.success && mealAdviceData.advice) {
      return mealAdviceData.advice;
    }
    return mealAdviceData;
  } catch (err) {
    console.error("Error fetching meal advice:", err.message);
    // Return a default advice if service fails
    return {
      verdict: "NEUTRAL",
      justification: "Unable to generate detailed advice at this time.",
      tips: ["Enjoy your meal!", "Stay hydrated"],
      analysis_notes: "Meal advice service unavailable",
      notes: "Please try again later",
      calorie_percentage: 0,
      will_exceed_targets: {}
    };
  }
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
  let userId = null;

  try {
    if (Buffer.isBuffer(req.body)) {
      // Raw bytes sent by the Telegram bot
      imageBuffer = req.body;
      // Try to get userId from header (bot sends it)
      userId = req.headers["x-user-id"] || null;
    } else if (req.body && req.body.requestId) {
      // Telegram photo upload flow – locate the stored image
      const { buffer, mimeType: mt } = await fetchTelegramPhoto(req.body.requestId);
      imageBuffer = buffer;
      mimeType = mt;
      userId = req.body.userId || null;
    } else if (req.body && req.body.image) {
      // Base64-encoded image from the webapp
      imageBuffer = Buffer.from(req.body.image, "base64");
      userId = req.body.userId || null;
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

  // Persist one combined log entry per meal analysis when userId is provided.
  if (userId) {
    try {
      await saveNutritionLogs(userId, result);
    } catch (err) {
      console.error("Failed to save nutrition logs:", err.message);
    }
  }

  // Get meal advice if userId provided
  let mealAdvice = null;
  if (userId) {
    try {
      const mealData = {
        food_name: result.name,
        calories: result.calories,
        protein: result.macros.protein,
        carbs: result.macros.carbs,
        fats: result.macros.fats,
        fiber: 0,
        sodium: 0
      };
      mealAdvice = await getMealAdvice(mealData, userId);
    } catch (err) {
      console.error("Failed to get meal advice:", err.message);
    }
  }

  // Determine chat ID to notify via Telegram
  let chatId = null;
  if (req.body && req.body.chatId) {
    chatId = req.body.chatId;
  } else if (userId) {
    try {
      const user = await User.findById(userId).select("telegramChatId");
      if (user && user.telegramChatId) chatId = user.telegramChatId;
    } catch (_) {
      // Non-fatal – proceed without Telegram notification
    }
  }

  // Send Telegram notification if we have a chat ID and bot token
  const token = process.env.TELEGRAM_TOKEN;
  if (chatId && token) {
    let adviceText = "Enjoy your meal!";
    if (mealAdvice) {
      adviceText = `${mealAdvice.verdict}: ${mealAdvice.notes}`;
    }

    const text =
      `📊 *Meal Analysis*\n\n` +
      `🍽️ *${result.name}*\n` +
      `🔥 ${result.calories} kcal\n\n` +
      `*Macros:*\n` +
      `• Protein: ${result.macros.protein}g\n` +
      `• Carbs: ${result.macros.carbs}g\n` +
      `• Fats: ${result.macros.fats}g\n\n` +
      `*Highlights:* ${result.highlights.join(", ")}\n` +
      `*Suggestion:* ${adviceText}`;

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

  // Build response with meal advice
  const responseData = {
    name: result.name,
    calories: result.calories,
    macros: result.macros,
    highlights: result.highlights,
    advice: mealAdvice || "Enjoy your meal!"
  };

  res.json(responseData);
});

/**
 * Send a fridge/pantry image buffer to the Python AI service for ingredient analysis.
 * @param {Buffer} imageBuffer  Raw image bytes
 * @param {string} mimeType     MIME type of the image
 * @returns {Promise<object>}   Parsed JSON from the AI service
 */
async function callAIIngredientService(imageBuffer, mimeType = "image/jpeg") {
  const aiApiUrl = process.env.AI_API_URL || "http://localhost:8000";

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append("image", blob, "fridge.jpg");

  const response = await fetch(`${aiApiUrl}/api/analyze-ingredients`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI ingredient service error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Transform the AI ingredient service response into the shape the React frontend expects.
 * @param {object} aiData  Response from the Python AI ingredient service
 * @returns {object}       { detected: string[], recipes: { id, title, desc, missing }[] }
 */
function transformIngredientResponse(aiData) {
  const detected = aiData.detected_ingredients || [];
  const recipes = (aiData.recipes || []).map((r, idx) => ({
    id: `r${idx + 1}`,
    title: r.title || "Recipe",
    desc: r.description || "",
    missing: r.missing_ingredients || [],
  }));
  return { detected, recipes };
}

// ---------------------------------------------------------------------------
// POST /analyze-ingredients
//
// Accepts a fridge/pantry photo and returns detected ingredients + recipe ideas.
// Supports two content types:
//   - application/json: { image: "<base64>" }
//   - application/json: { requestId: "<uuid>" }  (Telegram upload)
// ---------------------------------------------------------------------------
app.post("/analyze-ingredients", analyzeLimiter, async (req, res) => {
  let imageBuffer;
  let mimeType = "image/jpeg";

  try {
    if (Buffer.isBuffer(req.body)) {
      imageBuffer = req.body;
    } else if (req.body && req.body.requestId) {
      const { buffer, mimeType: telegramMimeType } = await fetchTelegramPhoto(req.body.requestId);
      imageBuffer = buffer;
      mimeType = telegramMimeType;
    } else if (req.body && req.body.image) {
      imageBuffer = Buffer.from(req.body.image, "base64");
    } else {
      return res.status(400).json({ message: "No image provided." });
    }
  } catch (err) {
    console.error("Image retrieval error:", err.message);
    return res.status(400).json({ message: err.message || "Failed to retrieve image." });
  }

  try {
    const aiData = await callAIIngredientService(imageBuffer, mimeType);
    if (!aiData.success) {
      return res.status(502).json({
        message: aiData.error || "AI ingredient analysis returned no results. Please try again with a clearer image.",
      });
    }
    const result = transformIngredientResponse(aiData);
    res.json(result);
  } catch (err) {
    console.error("AI ingredient analysis error:", err.message);
    return res.status(502).json({
      message: "AI ingredient analysis service is unavailable. Please ensure the AI server is running.",
      detail: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
