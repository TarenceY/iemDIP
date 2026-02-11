const express = require("express");
const router = express.Router();
const UsersController = require("../controllers/usersController");

router.post("/register", UsersController.register);
router.post("/login", UsersController.login);
router.put("/profile/:id", UsersController.updateProfile);
router.get("/:id", UsersController.getUserInfo);

module.exports = router;
