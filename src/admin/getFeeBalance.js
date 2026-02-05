// src/admin/getFeeBalance.js
import FeeLedger from "../../models/FeeLedger.js";

/**
 * Returns total unwithdrawn fees (SOL)
 * INTERNAL / ADMIN ONLY
 */
export async function getFeeBalance() {
  const fees = await FeeLedger.find({ status: "recorded" });

  const totalSol = fees.reduce(
    (sum, f) => sum + Number(f.amountSol || 0),
    0
  );

  return {
    totalSol,
    feeCount: fees.length,
  };
}
