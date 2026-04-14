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
 * Value: { state: string, pendingUsername?: string, userId?: string, username?: string }
 *
 * States:
 *   "idle"              – not logged in, no active login flow
 *   "awaiting_username" – bot has asked the user for their username / email
 *   "awaiting_password" – bot has received username and is waiting for password
 *   "authenticated"     – user is logged in
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
  return session && session.state === "authenticated";
}

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state === "authenticated") {
    bot.sendMessage(chatId,
      `Welcome back, ${session.username}! Send me a photo of your meal with the calibration card, or use /logout to sign out.`
    );
  } else {
    bot.sendMessage(chatId,
      "Hi! To use this bot, please log in first.\n\nUse /login to sign in with your account."
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
        `✅ Login successful! Welcome, ${result.username}.\n\nYou can now send me a photo of your meal with the calibration card for analysis.`
      );
    } catch (err) {
      const message = err.response?.data?.message || "Login failed. Please try again.";
      session.state = "idle";
      delete session.pendingUsername;
      bot.sendMessage(chatId, `❌ ${message}\n\nUse /login to try again.`);
    }
    return;
  }

  // Authenticated users may get here from free-text – just guide them
  if (session.state === "authenticated") {
    bot.sendMessage(chatId, "Send me a photo of your meal with the calibration card to analyze it.");
  } else {
    bot.sendMessage(chatId, "Please use /login to sign in before using this bot.");
  }
});

// Listen for photos
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;

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

  // No pending request – do the normal meal analysis flow
  bot.sendMessage(chatId, "Got your photo. Analyzing...");

  try {
    const session = getSession(chatId);
    const userId = session.userId || null;
    const result = await sendPhotoToApi(bot, best.file_id, API_URL, userId);
    // Format the response with MealAdvice data if available
    let mealAdviceText = "";
    if (result.advice && typeof result.advice === "object") {
      // MealAdvice object received
      const advice = result.advice;
      mealAdviceText =
        `\n\n📋 *Meal Advice*\n` +
        `\n*Justification:* ${advice.justification}\n\n` +
        (advice.analysis_notes ? `*Analysis:* ${advice.analysis_notes}\n\n` : "") +
        (advice.notes ? `*Suggestion:* ${advice.notes}\n` : "");
    } else {
      // Simple advice string
      mealAdviceText = `\n\n*Suggestion:* ${result.advice || "Enjoy your meal!"}`;
    }

    const text =
      `📊 *Meal Analysis*\n\n` +
      `🍽️ *${result.name}*\n` +
      `🔥 ${result.calories} kcal\n\n` +
      `*Macros:*\n` +
      `• Protein: ${result.macros.protein}g\n` +
      `• Carbs: ${result.macros.carbs}g\n` +
      `• Fats: ${result.macros.fats}g\n\n` +
      `*Verdict:* ${result.advice && typeof result.advice === "object" ? result.advice.verdict : "N/A"}` +
      mealAdviceText;

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "Sorry—analysis failed. Please try again.");
  }
});

console.log("Telegram bot running. Send /start in Telegram.");