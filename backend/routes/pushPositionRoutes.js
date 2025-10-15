const express = require("express");
const { postPosition } = require("../controllers/pushPositionController");

const router = express.Router();

router.post("/", postPosition);

module.exports = router;
