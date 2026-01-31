export function buildSessionAuthMessage({
  wallet,
  sessionPubkey,
  solPerTrade,
  expiresAt,
}) {
  return `
AUTOSWAP TRADING AUTHORIZATION

Wallet: ${wallet}
Session Key: ${sessionPubkey}

Max SOL per trade: ${solPerTrade} SOL
Expires at: ${expiresAt}

This signature authorizes Autoswap to trade
within the limits above. No withdrawals allowed.
`;
}
