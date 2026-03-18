const Recipe = require("../models/Recipe");

// Create a new recipe
exports.createRecipe = async (req, res) => {
  try {
    const { title, description, prep_time, cook_time, servings, difficulty, ingredients, steps, categories, created_by } = req.body;

    const recipe = new Recipe({
      title,
      description,
      prep_time,
      cook_time,
      servings,
      difficulty,
      ingredients,
      steps,
      categories,
      created_by,
    });

    await recipe.save();

    res.status(201).json({
      message: "Recipe created successfully",
      recipeId: recipe._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all recipes (with optional category filter)
exports.getRecipes = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.categories = req.query.category;
    }

    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    const recipes = await Recipe.find(filter).select("title description prep_time cook_time servings difficulty categories created_at");
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single recipe by ID
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a recipe
exports.updateRecipe = async (req, res) => {
  try {
    const { title, description, prep_time, cook_time, servings, difficulty, ingredients, steps, categories } = req.body;

    const updates = { title, description, prep_time, cook_time, servings, difficulty, ingredients, steps, categories };

    // Remove undefined fields so they are not overwritten with undefined
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const recipe = await Recipe.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    res.json({ message: "Recipe updated successfully", recipe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a recipe
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json({ message: "Recipe deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
