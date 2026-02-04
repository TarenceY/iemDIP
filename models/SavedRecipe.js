const mongoose = require("mongoose");

const savedRecipeSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    recipe_id: { type: mongoose.Schema.Types.ObjectId, ref: "recipes", required: true },
  },
  { timestamps: { createdAt: "saved_at", updatedAt: false } }
);

module.exports = mongoose.model("saved_recipes", savedRecipeSchema);