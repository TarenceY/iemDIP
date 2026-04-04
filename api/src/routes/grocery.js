const express = require("express");
const router = express.Router();
const GroceryController = require("../controllers/groceryController");

router.get("/", GroceryController.getItems);
router.post("/", GroceryController.addItem);
router.patch("/:id", GroceryController.toggleItem);
router.delete("/:id", GroceryController.deleteItem);

module.exports = router;
