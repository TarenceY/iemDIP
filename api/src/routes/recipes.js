const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  createRecipe,
  getRecipes,
  getRecipeById
} = require("../controllers/recipesController");

const recipesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { message: "Too many recipe requests. Please try again shortly." },
});

router.post("/", recipesLimiter, createRecipe);
router.get("/", recipesLimiter, getRecipes);
router.get("/:id", recipesLimiter, getRecipeById);

module.exports = router;