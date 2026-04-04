const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  user_id: String,
  log_date: Date,
  food_name: String,
  calories: Number,
  carbs: Number,
  protein: Number,
  fats: Number,
  fiber: Number,
  sodium: Number,
  notes: String,
  type: { type: String, default: "tracked" }, // "tracked" (scan-meal) | "planned" (scan-ingredients)
  ingredients: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("NutritionLog", logSchema);
