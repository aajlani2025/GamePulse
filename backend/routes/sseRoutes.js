const express = require("express");
const { addClient } = require("../sse/sseManager");
const verifyAccessToken = require("../middleware/authMiddleware");
const { postFatigue } = require("../controllers/pushFatigueController");

const router = express.Router();

// SSE connection endpoint (only for authenticated users)
router.get("/", verifyAccessToken, (req, res) => {
  addClient(req, res);
});

// Push endpoint (kept here because it's logically tied to SSE broadcasting)
router.post("/", postFatigue);

module.exports = router;
