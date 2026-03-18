const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const RecipesController = require("../controllers/recipesController");

// General rate limiter for recipe endpoints
const recipeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { message: "Too many requests. Please try again shortly." },
});

// Stricter limiter for write operations
const writeRecipeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { message: "Too many write requests. Please try again shortly." },
});

router.post("/", writeRecipeLimiter, RecipesController.createRecipe);
router.get("/", recipeLimiter, RecipesController.getRecipes);
router.get("/:id", recipeLimiter, RecipesController.getRecipeById);
router.put("/:id", writeRecipeLimiter, RecipesController.updateRecipe);
router.delete("/:id", writeRecipeLimiter, RecipesController.deleteRecipe);

module.exports = router;
