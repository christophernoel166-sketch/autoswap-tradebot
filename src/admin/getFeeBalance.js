// src/admin/getFeeBalance.js
import FeeLedger from "../../models/FeeLedger.js";

/**
 * Returns total recorded platform fees (SOL)
 * INTERNAL / ADMIN ONLY
 */
export async function getFeeBalance() {
  const fees = await FeeLedger.find({ status: "recorded" }).lean();

  const totalSol = fees.reduce(
    (sum, f) => sum + Number(f.amountSol || 0),
    0
  );

  return {
    totalSol: Number(totalSol.toFixed(6)),
    feeCount: fees.length,
  };
}