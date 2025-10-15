const express = require("express");
const { postPush } = require("../controllers/pushController");

const router = express.Router();

router.post("/", postPush);

module.exports = router;
