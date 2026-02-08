import crypto from "crypto";
import AdminToken from "../models/AdminToken.js";
import { verifyAdminToken } from "../models/adminJwt.js";


const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

export async function requireAdmin(req, res, next) {
  try {
    // --------------------------------------------------
    // 1️⃣ Extract token
    // --------------------------------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "admin_token_missing" });
    }

    const token = authHeader.replace("Bearer ", "");

    // --------------------------------------------------
    // 2️⃣ Verify JWT
    // --------------------------------------------------
    const decoded = verifyAdminToken(token);

    // --------------------------------------------------
    // 3️⃣ IP allowlist (if configured)
    // --------------------------------------------------
    if (ADMIN_IP_ALLOWLIST.length) {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

      if (!ADMIN_IP_ALLOWLIST.includes(ip)) {
        return res.status(403).json({ error: "ip_not_allowed" });
      }
    }

    // --------------------------------------------------
    // 4️⃣ Check token state in DB
    // --------------------------------------------------
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const record = await AdminToken.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(401).json({ error: "admin_token_invalid" });
    }

    // --------------------------------------------------
    // ✅ OK
    // --------------------------------------------------
    req.admin = {
      adminId: decoded.adminId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "admin_auth_failed" });
  }
}
