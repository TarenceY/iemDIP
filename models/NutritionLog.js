const mongoose = require("mongoose");

const nutritionLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

    log_date: { type: Date, required: true, default: Date.now },
    meal_image_url: { type: String, default: "" },

    calories: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },

    notes: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("nutrition_logs", nutritionLogSchema);