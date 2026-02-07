import { Connection } from "@solana/web3.js";

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("RPC_URL missing");

let connection;

export function getConnection() {
  if (!connection) {
    connection = new Connection(RPC_URL, "confirmed");
  }
  return connection;
}
