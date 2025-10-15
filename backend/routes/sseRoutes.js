const express = require("express");
const { addClient } = require("../sse/sseManager");
const { postPush } = require("../controllers/pushController");

const router = express.Router();

// SSE connection endpoint
router.get("/", (req, res) => {
  addClient(req, res);
});

// Push endpoint (kept here because it's logically tied to SSE broadcasting)
router.post("/", postPush);

module.exports = router;
