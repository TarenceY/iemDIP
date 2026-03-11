const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true }, // <-- add unique
  email: { type: String, unique: true },    // <-- add unique
  password_hash: String,
  health_conditions: String, // optional: legacy
  age: Number,
  gender: String,
  restrictions: [String], // array of dietary restrictions
  dislikes: [String],     // array of dislikes
  goals: [String],        // array of goals
  telegramChatId: String,    // linked Telegram chat ID for bot notifications
  telegramUsername: String,  // Telegram @username (without @), used to look up chatId
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);