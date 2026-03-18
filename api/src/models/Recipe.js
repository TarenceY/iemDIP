const mongoose = require("mongoose");

// Sub-schema for a single ingredient line
const ingredientSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    quantity: { type: Number },
    unit:     { type: String }, // e.g. g, ml, tbsp, cloves
  },
  { _id: false }
);

// Sub-schema for a single cooking step
const stepSchema = new mongoose.Schema(
  {
    step_number:  { type: Number, required: true },
    instruction:  { type: String, required: true },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  prep_time:   { type: Number }, // minutes
  cook_time:   { type: Number }, // minutes
  servings:    { type: Number },
  difficulty:  { type: String, enum: ["Easy", "Medium", "Hard"] },
  ingredients: [ingredientSchema],
  steps:       [stepSchema],
  categories:  [{ type: String }], // e.g. ["Dinner", "Vegan"]
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional link to user
  created_at:  { type: Date, default: Date.now },
});

module.exports = mongoose.model("Recipe", recipeSchema);
