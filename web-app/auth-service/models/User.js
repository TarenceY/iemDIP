const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, default: "demo_user" },
  age: Number,
  gender: String,
  dietaryRestrictions: [String], // e.g., ["Halal", "Vegetarian"]
  healthGoal: String             // e.g., "Weight Loss"
});

module.exports = mongoose.model("User", userSchema);