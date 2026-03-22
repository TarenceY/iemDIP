const express = require("express");
const router = express.Router();

const {
  createRecipe,
  getRecipes,
  getRecipeById
} = require("../controllers/recipesController");

router.post("/", createRecipe);
router.get("/", getRecipes);
router.get("/:id", getRecipeById);

module.exports = router;