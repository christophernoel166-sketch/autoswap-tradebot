import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB })
.then(() => {
  console.log("✅ TEST: MongoDB connected successfully");
  process.exit();
})
.catch(err => {
  console.error("❌ TEST: MongoDB connection failed:", err);
  process.exit();
});
