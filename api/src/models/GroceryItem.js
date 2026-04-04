const mongoose = require("mongoose");

const grocerySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, default: "Uncategorised" },
  checked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GroceryItem", grocerySchema);
