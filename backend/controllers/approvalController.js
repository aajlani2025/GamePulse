const jwt = require("jsonwebtoken");
const approvalService = require("../services/approvalService");

// resolve user id from Authorization header (Bearer) or refresh cookie
function resolveUserId(req) {
  const authHeader = req.headers?.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      if (payload && (payload.sub || payload.id))
        return payload.sub || payload.id;
    } catch (e) {
      // ignore and fallback to refresh cookie
    }
  }

  const refresh = req.cookies?.refreshToken;
  if (refresh) {
    try {
      const payload = jwt.verify(refresh, process.env.REFRESH_TOKEN_SECRET);
      if (payload && (payload.sub || payload.id))
        return payload.sub || payload.id;
    } catch (e) {
      // invalid refresh
    }
  }

  return null;
}

const postApproval = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.sendStatus(401);

    const consentRaw = req.body?.consent;
    const consent = typeof consentRaw === "boolean" ? consentRaw : true;

    const inserted = await approvalService.createApprovalForUser(
      userId,
      consent
    );
    const insertedId = inserted?.id ?? null;
    // inserted should include consent_given based on repository RETURNING
    const approved = Boolean(inserted?.consent_given);
    console.info(
      `[approval] stored consent for user_id=${userId} id=${insertedId} approved=${approved}`
    );
    return res.status(201).json({ ok: true, id: insertedId, approved });
  } catch (err) {
    console.error("Approval controller error:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};

module.exports = { postApproval };
