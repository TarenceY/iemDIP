const NutritionLog = require("../models/NutritionLog");

exports.getUserLogs = async (req, res) => {
  try {
    const { userId, limit } = req.query;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const cap = Math.min(parseInt(limit, 10) || 100, 100);

    const logs = await NutritionLog.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(cap);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLog = async (req, res) => {
  try {
    const { userId, foodName, calories, protein, carbs, fats, notes, type, ingredients, highlights, suggestions } = req.body;
    if (!userId || !foodName) {
      return res.status(400).json({ message: "userId and foodName are required" });
    }

    const log = new NutritionLog({
      user_id: userId,
      log_date: new Date(),
      food_name: foodName,
      calories: calories || 0,
      carbs: carbs || 0,
      protein: protein || 0,
      fats: fats || 0,
      notes: notes || "",
      type: type || "tracked",
      ingredients: ingredients || [],
      highlights: highlights || [],
      suggestions: suggestions || [],
    });

    await log.save();
    res.status(201).json({ message: "Log saved", log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
