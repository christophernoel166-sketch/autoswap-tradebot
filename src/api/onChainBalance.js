import express from "express";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const router = express.Router();

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("RPC_URL missing");

const connection = new Connection(RPC_URL, "confirmed");

/**
 * GET /api/onchain-balance/:wallet
 */
router.get("/:wallet", async (req, res) => {
  try {
    const wallet = String(req.params.wallet || "").trim();

    if (!wallet) {
      return res.status(400).json({ error: "wallet_required" });
    }

    const pubkey = new PublicKey(wallet);
    const lamports = await connection.getBalance(pubkey);

    return res.json({
      wallet,
      lamports,
      sol: lamports / LAMPORTS_PER_SOL,
    });
  } catch (err) {
    console.error("onchain-balance error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;