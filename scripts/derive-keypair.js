import bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";

// ⚠️ TEMPORARY — DO NOT COMMIT THIS FILE
const MNEMONIC = "PUT YOUR PHANTOM RECOVERY PHRASE HERE";

const seed = bip39.mnemonicToSeedSync(MNEMONIC);

const derivedSeed = derivePath(
  "m/44'/501'/0'/0'",
  seed.toString("hex")
).key;

const keypair = Keypair.fromSeed(derivedSeed);

console.log("✅ Derived public key:");
console.log(keypair.publicKey.toBase58());
