export function solscanTxUrl(signature) {
  if (!signature) return null;
  return `https://solscan.io/tx/${signature}`;
}
