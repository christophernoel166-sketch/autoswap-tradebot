import jwt from "jsonwebtoken";
import crypto from "crypto";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET missing");
}

export function signAdminToken({ adminId, ttlMinutes = 60 }) {
  const payload = {
    adminId,
  };

  const token = jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: `${ttlMinutes}m`,
  });

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return { token, tokenHash };
}

export function verifyAdminToken(token) {
  return jwt.verify(token, ADMIN_JWT_SECRET);
}
