// src/admin/getFeeSummary.js
import Withdrawal from "../../models/Withdrawal.js";

export async function getFeeSummary() {
  const rows = await Withdrawal.find({
    feeSol: { $gt: 0 },
  }).lean();

  let totalFees = 0;
  let withdrawnFees = 0;

  for (const w of rows) {
    totalFees += Number(w.feeSol || 0);
    if (w.feeWithdrawn === true) {
      withdrawnFees += Number(w.feeSol || 0);
    }
  }

  return {
    totalFees,
    withdrawnFees,
    availableFees: totalFees - withdrawnFees,
    count: rows.length,
  };
}
