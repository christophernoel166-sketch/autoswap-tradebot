// src/utils/loadSessionSigner.js
import { Keypair } from "@solana/web3.js";
import SessionAuthorization from "../../models/SessionAuthorization.js";
import bs58 from "bs58";

/**
 * Load delegated session signer (Keypair)
 * NEVER logs secret
 * NEVER persists decrypted key
 */
export async function loadSessionSigner(sessionPubkey) {
  if (!sessionPubkey) {
    throw new Error("Session pubkey missing");
  }

  const session = await SessionAuthorization.findOne({
    sessionPubkey,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new Error("Active session not found");
  }

  if (!session.encryptedSecretKey) {
    throw new Error("Session secret not available");
  }

  // 🔐 Decode secret (already encrypted-at-rest)
  const secretKeyBytes = bs58.decode(session.encryptedSecretKey);

  if (secretKeyBytes.length !== 64) {
    throw new Error("Invalid session secret key length");
  }

  // 🔑 Rebuild Keypair in memory ONLY
  const keypair = Keypair.fromSecretKey(secretKeyBytes);

  if (keypair.publicKey.toBase58() !== sessionPubkey) {
    throw new Error("Session key mismatch");
  }

  return keypair;
}
