import {
  Connection, Keypair, clusterApiUrl, PublicKey
} from "@solana/web3.js";
import {
  createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const payer = Keypair.generate(); // Or load from your keypair

// 1️⃣ Create a new token mint
const mint = await createMint(connection, payer, payer.publicKey, null, 9);
console.log("Token Mint Address:", mint.toBase58());

// 2️⃣ Create associated token account for wallet
const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);

// 3️⃣ Mint tokens to wallet
await mintTo(connection, payer, mint, tokenAccount.address, payer, 1000000000); // 1,000 tokens (with 9 decimals)

// 4️⃣ Transfer to another wallet
const recipient = new PublicKey("RECIPIENT_PUBLIC_KEY_HERE");
const recipientAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);
await transfer(connection, payer, tokenAccount.address, recipientAccount.address, payer.publicKey, 100000000);
