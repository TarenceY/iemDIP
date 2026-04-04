const GroceryItem = require("../models/GroceryItem");

exports.getItems = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const items = await GroceryItem.find({ user_id: userId }).sort({ created_at: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { userId, name, category } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ message: "userId and name are required" });
    }

    const item = await GroceryItem.create({
      user_id: userId,
      name: name.trim(),
      category: category || "Uncategorised",
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleItem = async (req, res) => {
  try {
    const item = await GroceryItem.findByIdAndUpdate(
      req.params.id,
      { checked: req.body.checked },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await GroceryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
