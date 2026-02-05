import dotenv from "dotenv";
import mongoose from "mongoose";
import { getFeeBalance } from "../src/admin/getFeeBalance.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const result = await getFeeBalance();
console.log("💰 FEE BALANCE:", result);

await mongoose.disconnect();
process.exit(0);
