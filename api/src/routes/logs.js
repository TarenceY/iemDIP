const express = require("express");
const router = express.Router();
const LogsController = require("../controllers/logsController");

router.get("/", LogsController.getUserLogs);
router.post("/", LogsController.createLog);

module.exports = router;
