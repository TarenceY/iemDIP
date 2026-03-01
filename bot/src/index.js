import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { sendPhotoToApi } from "./services/apiClient.js";
import { loginUser, linkTelegramChatId } from "./services/authService.js";

dotenv.config(); // reads .env at repo root or bot/.env
const token = process.env.TELEGRAM_TOKEN;
const API_URL = process.env.API_URL || "http://localhost:4000";

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
        await linkTelegramChatId(result.userId, chatId, API_URL);
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
  bot.sendMessage(chatId, "Got your photo. Analyzing...");

  try {
    const result = await sendPhotoToApi(bot, best.file_id, API_URL);
    // Expect result like { nutrition: {...}, items: [...] }
    await bot.sendMessage(chatId, `Analysis:\n${JSON.stringify(result, null, 2)}`);
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "Sorry—analysis failed. Please try again.");
  }
});

console.log("Telegram bot running. Send /start in Telegram.");