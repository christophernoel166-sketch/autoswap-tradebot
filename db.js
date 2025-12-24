import mongoose from "mongoose";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) return;

  mongoose.connection.on("connected", () => {
    isConnected = true;
    console.log("✅ MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️ MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    isConnected = false;
    console.error("❌ MongoDB error:", err.message);
  });

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
  });
}

export function mongoHealth() {
  return {
    state: mongoose.connection.readyState,
    isConnected,
  };
}
