const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const refreshController = require("../controllers/refreshController");
const logoutController = require("../controllers/logoutController");
const approvalController = require("../controllers/approvalController");
const meController = require("../controllers/meController");
const verifyAccessToken = require("../middleware/authMiddleware");

router.post("/login", authController.handleLogin);
router.post("/approval", approvalController.postApproval);
router.post("/refresh", refreshController.handleRefresh);
router.post("/logout", logoutController.logout);
router.get("/me", verifyAccessToken, meController.getMe);

module.exports = router;
