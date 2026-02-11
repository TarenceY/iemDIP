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
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("NutritionLog", logSchema);
