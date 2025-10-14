const approvalService = require("../services/approvalService");
const logger = require("../config/logger");

// POST /auth/approval

const postApproval = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.sendStatus(401);

    const userId = user.id;
    const consentRaw = req.body?.consent;
    const consent = typeof consentRaw === "boolean" ? consentRaw : true;

    const inserted = await approvalService.createApprovalForUser(
      userId,
      consent
    );
    const insertedId = inserted?.id ?? null;
    const approved = Boolean(inserted?.consent_given);
    logger.info({ userId, insertedId, approved }, "[approval] stored consent");
    return res.status(201).json({ ok: true, id: insertedId, approved });
  } catch (err) {
    logger.error({ err }, "Approval controller error");
    return res.status(500).json({ error: "internal_server_error" });
  }
};

module.exports = { postApproval };
