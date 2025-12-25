const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getAllPlayers } = require("../controllers/playersController");

const router = express.Router();

// GET /players - retrieve all players for authenticated user
router.get("/", authMiddleware, getAllPlayers);

module.exports = router;
