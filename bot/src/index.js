import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { sendPhotoToApi } from "./services/apiClient.js";

dotenv.config(); // reads .env at repo root or bot/.env
const token = "8421621532:AAGs1TrYzS6BqQSe4E_qnM8W64Pi7N-mnOU";
const API_URL = process.env.API_URL || "http://localhost:4000";

if (!token) {
  console.error("Missing TELEGRAM_TOKEN in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hi! Send me a photo of your meal with the calibration card.");
});

// Listen for photos
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
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