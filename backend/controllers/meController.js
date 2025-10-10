const approvalService = require("../services/approvalService");

// Returns minimal info about current authenticated user, including approved boolean
async function getMe(req, res) {
  try {
    // req.user is set by auth middleware (verifyAccessToken)
    const user = req.user;
    if (!user) return res.sendStatus(401);

    const approved = await approvalService.hasUserApproved(user.id);
    return res.json({ id: user.id, username: user.username, approved });
  } catch (err) {
    console.error("meController error:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
}

module.exports = { getMe };
