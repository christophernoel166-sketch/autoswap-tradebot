import { solscanTxUrl } from "../utils/solscan";

export default function WithdrawStatusList({ withdrawals = [], loading }) {
  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Loading withdrawals…
      </div>
    );
  }

  if (!withdrawals.length) {
    return (
      <div className="text-sm text-gray-500">
        No withdrawals yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {withdrawals.map((w) => (
        <div
          key={w._id}
          className="flex justify-between items-center
                     bg-gray-50 dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700
                     rounded p-2 text-sm"
        >
          {/* LEFT — Amount + time */}
          <div>
            <div className="font-medium">
              {Number(w.amountSol).toFixed(4)} SOL
            </div>

            <div className="text-xs text-gray-500">
              {new Date(w.createdAt).toLocaleString()}
            </div>

            {/* 🔗 Solscan link (only when tx exists) */}
            {w.txSignature && (
              <a
                href={solscanTxUrl(w.txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View on Solscan ↗
              </a>
            )}
          </div>

          {/* RIGHT — Status */}
          <div className="text-right">
            {w.status === "pending" && (
              <span className="text-yellow-600 font-medium">
                ⏳ Pending
              </span>
            )}

            {w.status === "sent" && (
              <span className="text-green-600 font-medium">
                ✅ Sent
              </span>
            )}

            {w.status === "failed" && (
              <span className="text-red-600 font-medium">
                ❌ Failed
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
