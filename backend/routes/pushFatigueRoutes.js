const express = require("express");
const { postFatigue } = require("../controllers/pushFatigueController");

const router = express.Router();

router.post("/", postFatigue);

module.exports = router;
