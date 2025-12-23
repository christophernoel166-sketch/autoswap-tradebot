import express from "express";
import nacl from "tweetnacl";
import bs58 from "bs58";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Temporary in-memory nonce storage
const nonceStore = new Map();

/**
 * STEP 1 — GET NONCE
 */
router.get("/wallet/nonce/:wallet", (req, res) => {
  const { wallet } = req.params;

  if (!wallet) {
    return res.status(400).json({ error: "Wallet address missing" });
  }

  const nonce = "Autoswap Login: " + Math.floor(Math.random() * 1_000_000);

  nonceStore.set(wallet, nonce);

  res.json({ nonce });
});

/**
 * STEP 2 — VERIFY SIGNATURE
 */
router.post("/wallet/verify", async (req, res) => {
  try {
    const { wallet, signature } = req.body;

    if (!wallet || !signature) {
      return res.status(400).json({ error: "wallet and signature required" });
    }

    const nonce = nonceStore.get(wallet);
    if (!nonce) return res.status(400).json({ error: "Nonce not found" });

    // Verify signature
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = bs58.decode(signature);
    const publicKey = bs58.decode(wallet);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey
    );

    if (!verified) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Remove nonce
    nonceStore.delete(wallet);

    // Load or create user
    let user = await User.findOne({ walletAddress: wallet });

    if (!user) {
      user = await User.create({
        walletAddress: wallet,
        createdAt: new Date(),
      });
    }

    // Sign login token (session)
    const token = jwt.sign(
      { walletAddress: wallet, userId: user._id },
      process.env.JWT_SECRET || "autoswap_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        walletAddress: wallet,
        settings: {
          solPerTrade: user.solPerTrade,
          tp1: user.tp1,
          tp2: user.tp2,
          tp3: user.tp3,
          stopLoss: user.stopLoss,
          trailingTrigger: user.trailingTrigger,
        },
      },
    });
  } catch (err) {
    console.error("wallet verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
