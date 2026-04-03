import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { sendPhotoToApi, uploadPhotoForRequest } from "./services/apiClient.js";
import { loginUser, linkTelegramChatId } from "./services/authService.js";

// Resolve the bot's own .env file regardless of the working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });
const token = process.env.TELEGRAM_TOKEN;
const API_URL = process.env.API_URL || "http://localhost:3000";

if (!token) {
  console.error("Missing TELEGRAM_TOKEN in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

/**
 * In-memory session store.
 * Key: chatId (number)
 * Value: { state: string, pendingUsername?: string, userId?: string, username?: string, mode?: string }
 *
 * States:
 *   "idle"              – not logged in, no active login flow
 *   "awaiting_username" – bot has asked the user for their username / email
 *   "awaiting_password" – bot has received username and is waiting for password
 *   "authenticated"     – user is logged in
 *   "awaiting_photo_createMeal"  – user selected /createMeal, waiting for ingredients photo
 *   "awaiting_photo_analyseNutrition" – user selected /analyseNutrition, waiting for meal photo
 *
 * Mode:
 *   "createMeal"       – extract ingredients and recommend recipes
 *   "analyseNutrition" – analyze nutrition of the meal
 *
 * Note: Sessions are stored in memory and will be cleared on bot restart.
 * Users will need to log in again after a restart.
 */
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { state: "idle" });
  }
  return sessions.get(chatId);
}

function isAuthenticated(chatId) {
  const session = sessions.get(chatId);
  // User is authenticated if they have logged in (have userId and username)
  // This remains true even if they're in awaiting_photo states
  return session && session.userId && session.username;
}

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state === "authenticated") {
    bot.sendMessage(chatId,
      `Welcome back, ${session.username}!\n\n` +
      "Choose what to do:\n" +
      "/createMeal - Extract ingredients from photo and get recipe recommendations\n" +
      "/analyseNutrition - Analyze nutrition content of your meal\n" +
      "/logout - Sign out from your account"
    );
  } else {
    bot.sendMessage(chatId,
      "Hi! To use this bot, please log in first.\n\n" +
      "Use /login to sign in with your account."
    );
  }
});

// /login command – start the login flow
bot.onText(/\/login/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state === "authenticated") {
    return bot.sendMessage(chatId, `You are already logged in as ${session.username}. Use /logout to sign out.`);
  }

  session.state = "awaiting_username";
  bot.sendMessage(chatId, "Please enter your username or email:");
});

// /logout command
bot.onText(/\/logout/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state !== "authenticated") {
    return bot.sendMessage(chatId, "You are not currently logged in. Use /login to sign in.");
  }

  const username = session.username;
  sessions.set(chatId, { state: "idle" });
  bot.sendMessage(chatId, `You have been logged out, ${username}. Use /login to sign in again.`);
});

// /createMeal command – extract ingredients and recommend recipes
bot.onText(/\/createMeal/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (!isAuthenticated(chatId)) {
    return bot.sendMessage(chatId, "Please use /login to sign in before using this command.");
  }

  session.state = "awaiting_photo_createMeal";
  session.mode = "createMeal";
  bot.sendMessage(chatId, 
    "📸 Send me a photo of your ingredients!\n\n" +
    "For best results:\n" +
    "- Include the ArUco calibration card for accurate measurements\n" +
    "- Show all ingredients clearly\n\n" +
    "I'll detect the ingredients and suggest recipes with proper portions."
  );
});

// /analyseNutrition command – analyze meal nutrition
bot.onText(/\/analyseNutrition/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (!isAuthenticated(chatId)) {
    return bot.sendMessage(chatId, "Please use /login to sign in before using this command.");
  }

  session.state = "awaiting_photo_analyseNutrition";
  session.mode = "analyseNutrition";
  bot.sendMessage(chatId, 
    "🍽️ Send me a photo of your meal!\n\n" +
    "For best results:\n" +
    "- Include the ArUco calibration card for portion size estimation\n" +
    "- Show the meal clearly\n\n" +
    "I'll analyze the nutrition content of your meal."
  );
});

// Handle all text messages for the login flow
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore commands and non-text messages
  if (!text || text.startsWith("/")) return;

  const session = getSession(chatId);

  if (session.state === "awaiting_username") {
    session.pendingUsername = text.trim();
    session.state = "awaiting_password";
    bot.sendMessage(chatId, "Please enter your password:");
    return;
  }

  if (session.state === "awaiting_password") {
    const password = text.trim();
    const usernameOrEmail = session.pendingUsername;

    // Delete the password message for security if supported
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (_) {
      // Deletion may fail in some chat types; continue regardless
    }

    try {
      const result = await loginUser(usernameOrEmail, password, API_URL);
      session.state = "authenticated";
      session.userId = result.userId;
      session.username = result.username;
      delete session.pendingUsername;

      // Link this Telegram chat to the user account so the webapp can notify via bot
      try {
        const telegramUsername = msg.from?.username || null;
        await linkTelegramChatId(result.userId, chatId, telegramUsername, API_URL);
      } catch (linkErr) {
        console.warn("Could not link Telegram chat ID:", linkErr.message);
      }

      bot.sendMessage(chatId,
        `✅ Login successful! Welcome, ${result.username}.\n\n` +
        "Choose what to do:\n" +
        "/createMeal - Extract ingredients and get recipe recommendations\n" +
        "/analyseNutrition - Analyze nutrition of your meal\n" +
        "/logout - Sign out"
      );
    } catch (err) {
      const message = err.response?.data?.message || "Login failed. Please try again.";
      session.state = "idle";
      delete session.pendingUsername;
      bot.sendMessage(chatId, `❌ ${message}\n\nUse /login to try again.`);
    }
    return;
  }

  // Authenticated users may get here from free-text – guide them to use a command
  if (session.state === "authenticated") {
    bot.sendMessage(chatId, 
      `Use /createMeal to extract ingredients and get recipes, or /analyseNutrition to analyze meal nutrition.`
    );
  } else {
    bot.sendMessage(chatId, "Please use /login to sign in before using this bot.");
  }
});

// Listen for photos
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (!isAuthenticated(chatId)) {
    return bot.sendMessage(chatId, "Please use /login to sign in before sending photos.");
  }

  const photos = msg.photo || [];
  if (photos.length === 0) {
    return bot.sendMessage(chatId, "No photo found. Please try again.");
  }

  // Get the highest-resolution photo
  const best = photos[photos.length - 1];

  // Check if the webapp is waiting for a photo upload for this chat
  try {
    const checkResp = await axios.get(`${API_URL}/telegram/photo-status/pending-check`, {
      params: { chatId },
      validateStatus: () => true,
    });

    if (checkResp.status === 200 && checkResp.data?.hasPending) {
      // A webapp photo request is pending – upload the photo to fulfil it
      bot.sendMessage(chatId, "📸 Got it! Uploading your photo to the webapp...");
      try {
        await uploadPhotoForRequest(bot, best.file_id, chatId, API_URL);
        await bot.sendMessage(chatId, "✅ Photo uploaded! Switch back to the webapp to see it.");
      } catch (uploadErr) {
        console.error("Photo upload for request failed:", uploadErr.message);
        await bot.sendMessage(chatId, "❌ Upload failed. Please try again from the webapp.");
      }
      return;
    }
  } catch (_) {
    // If the check fails (e.g. API not reachable), fall through to normal analysis
  }

  // Check if user selected a specific mode
  const mode = session.mode;

  if (session.state === "awaiting_photo_createMeal") {
    await handleCreateMealPhoto(chatId, best.file_id, session);
    session.state = "authenticated";
    session.mode = null;
  } else if (session.state === "awaiting_photo_analyseNutrition") {
    await handleAnalyseNutritionPhoto(chatId, best.file_id, session);
    session.state = "authenticated";
    session.mode = null;
  } else {
    // No specific mode selected – show user the choice
    await showModeChoice(chatId);
  }
});

/**
 * Handle /createMeal photo – extract ingredients and recommend recipes
 */
async function handleCreateMealPhoto(chatId, fileId, session) {
  try {
    await bot.sendMessage(chatId, "🔍 Analyzing your ingredients...");

    // Get file from Telegram
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const imageResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(imageResp.data);

    // Send to /analyze-ingredients endpoint (at the Node.js API root)
    const result = await axios.post(`${API_URL}/analyze-ingredients`, imageBuffer, {
      headers: { "Content-Type": "application/octet-stream" },
    });

    const { detected, recipes } = result.data;

    // Format ingredients message
    let ingredientsMsg = "✅ Detected Ingredients:\n\n";
    if (detected && detected.length > 0) {
      detected.forEach((ing) => {
        ingredientsMsg += `• ${ing}\n`;
      });
    } else {
      ingredientsMsg += "No ingredients detected.";
    }

    await bot.sendMessage(chatId, ingredientsMsg);

    // Format recipe recommendations
    if (recipes && recipes.length > 0) {
      let recipesMsg = "\n🍳 Recommended Recipes:\n\n";
      recipes.slice(0, 3).forEach((rec, idx) => {
        recipesMsg += `${idx + 1}. *${rec.title}*\n`;
        recipesMsg += `   ${rec.desc}\n`;
        if (rec.missing && rec.missing.length > 0) {
          recipesMsg += `   Missing: ${rec.missing.join(", ")}\n`;
        }
        recipesMsg += "\n";
      });
      await bot.sendMessage(chatId, recipesMsg, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "❌ No matching recipes found for these ingredients.");
    }

    // Reset state and show command options
    session.state = "authenticated";
    session.mode = null;
    await showCommandOptions(chatId, session.username);
  } catch (err) {
    console.error("createMeal error:", err.message);
    await bot.sendMessage(
      chatId,
      `❌ Error: ${err.response?.data?.detail || err.message}\n\nPlease try again with a clearer photo of your ingredients.`
    );
    session.state = "authenticated";
    session.mode = null;
    await showCommandOptions(chatId, session.username);
  }
}

/**
 * Handle /analyseNutrition photo – analyze meal nutrition
 */
async function handleAnalyseNutritionPhoto(chatId, fileId, session) {
  try {
    await bot.sendMessage(chatId, "🔍 Analyzing nutrition content...");

    // Get file from Telegram
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const imageResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(imageResp.data);

    // Send to /analyze endpoint (at the Node.js API root, not /api/analyze)
    const result = await axios.post(`${API_URL}/analyze`, imageBuffer, {
      headers: { "Content-Type": "application/octet-stream" },
    });

    const { name, calories, macros, highlights, suggestions } = result.data;

    // Format nutrition message
    let nutritionMsg = "📊 Nutrition Analysis:\n\n";
    nutritionMsg += `*${name}*\n\n`;
    nutritionMsg += `🔥 Total Calories: ${calories.toFixed(0)} kcal\n\n`;
    nutritionMsg += "*Macros:*\n";
    nutritionMsg += `• Protein: ${macros.protein.toFixed(1)}g\n`;
    nutritionMsg += `• Carbohydrates: ${macros.carbs.toFixed(1)}g\n`;
    nutritionMsg += `• Fat: ${macros.fats.toFixed(1)}g\n`;

    if (highlights && highlights.length > 0) {
      nutritionMsg += `\n*Highlights:* ${highlights.join(", ")}\n`;
    }

    if (suggestions && suggestions.length > 0) {
      nutritionMsg += `\n*Suggestions:*\n`;
      suggestions.forEach((sug) => {
        nutritionMsg += `• ${sug}\n`;
      });
    }

    await bot.sendMessage(chatId, nutritionMsg, { parse_mode: "Markdown" });

    // Reset state and show command options
    session.state = "authenticated";
    session.mode = null;
    await showCommandOptions(chatId, session.username);
  } catch (err) {
    console.error("analyseNutrition error:", err.message);
    await bot.sendMessage(
      chatId,
      `❌ Error: ${err.response?.data?.detail || err.message}\n\nPlease try again with a clearer photo of your meal.`
    );
    session.state = "authenticated";
    session.mode = null;
    await showCommandOptions(chatId, session.username);
  }
}

/**
 * Show available commands after successful analysis
 */
async function showCommandOptions(chatId, username) {
  await bot.sendMessage(
    chatId,
    `✅ Analysis complete, ${username}!\n\n` +
    "What would you like to do next?\n\n" +
    "/createMeal - Extract ingredients and get recipes\n" +
    "/analyseNutrition - Analyze meal nutrition\n" +
    "/logout - Sign out"
  );
}

console.log("Telegram bot running. Send /start in Telegram.");