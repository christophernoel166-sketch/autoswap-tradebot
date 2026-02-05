import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const wallet = "Gex4FzUyCz1tqzUc5JCzQXk3WC6jH9a9apzCCbdx6zX7";

  const result = await User.updateOne(
    { walletAddress: wallet },
    {
      $set: {
        tradingEnabled: false, // 👈 forces defaults to materialize
      },
    }
  );

  console.log("Update result:", result);

  const user = await User.findOne({ walletAddress: wallet }).lean();
  console.log("Updated user:", user);

  await mongoose.disconnect();
}

run().catch(console.error);
