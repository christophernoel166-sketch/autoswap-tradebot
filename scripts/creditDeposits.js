import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Deposit from "../models/Deposit.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("MONGO_URI missing");
}

async function creditDeposits() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const session = await mongoose.startSession();

  try {
    const deposits = await Deposit.find({
      status: "detected",
    }).limit(20); // batch limit for safety

    if (!deposits.length) {
      console.log("ℹ️ No deposits to credit");
      return;
    }

    for (const deposit of deposits) {
      await session.withTransaction(async () => {
        const { creditedWallet, amountSol, txSignature } = deposit;

        // 1️⃣ Lock deposit
        const freshDeposit = await Deposit.findOne(
          { _id: deposit._id, status: "detected" },
          null,
          { session }
        );

        if (!freshDeposit) {
          console.log("⏭️ Deposit already handled, skipping", txSignature);
          return;
        }

        // 2️⃣ Find user
        const user = await User.findOne(
          { walletAddress: creditedWallet },
          null,
          { session }
        );

        if (!user) {
          console.error("❌ No user found for deposit", {
            txSignature,
            creditedWallet,
          });
          return;
        }

        // 3️⃣ Credit balance (ATOMIC)
        await User.updateOne(
          { _id: user._id },
          {
            $inc: {
              balanceSol: amountSol,
            },
          },
          { session }
        );

        // 4️⃣ Mark deposit as credited
        await Deposit.updateOne(
          { _id: deposit._id },
          {
            $set: {
              status: "credited",
            },
          },
          { session }
        );

        console.log("✅ DEPOSIT CREDITED", {
          wallet: creditedWallet,
          amountSol,
          txSignature,
        });
      });
    }
  } catch (err) {
    console.error("❌ Credit deposit error:", err);
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

creditDeposits().then(() => {
  console.log("🏁 Credit run finished");
  process.exit(0);
});
