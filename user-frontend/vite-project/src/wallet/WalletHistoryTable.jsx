export default function WalletHistoryTable({ records }) {
  if (!records.length) {
    return (
      <div className="text-sm text-gray-500">
        No deposits or withdrawals yet.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Wallet History</h3>

      <table className="w-full text-sm">
        <thead className="text-gray-500">
          <tr>
            <th align="left">Type</th>
            <th align="right">Amount (SOL)</th>
            <th align="left">Status</th>
            <th align="right">Time</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 capitalize">{r.type}</td>
              <td className="py-2 text-right">
                {r.type === "withdraw" ? "−" : "+"}
                {Number(r.amountSol).toFixed(4)}
              </td>
              <td className="py-2 capitalize">{r.status}</td>
              <td className="py-2 text-right">
                {new Date(r.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
