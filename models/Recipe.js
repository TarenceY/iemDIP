const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    ingredient_list: { type: String, default: "" }, // ERD says text
    generated_by: { type: String, default: "manual" }, // e.g. "manual", "ai"
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("recipes", recipeSchema);