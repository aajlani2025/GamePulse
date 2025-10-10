const express = require("express");
const { addClient } = require("../sse/sseManager");

const router = express.Router();

router.get("/", (req, res) => {
  addClient(req, res);
});

module.exports = router;
