export function buyQueueKey() {
  return "trade:buy:queue";
}

export function sellQueueKey() {
  return "trade:sell:queue";
}

export function buyLockKey(walletAddress, mint) {
  return `lock:buy:${walletAddress}:${mint}`;
}

export function sellLockKey(walletAddress, mint) {
  return `lock:sell:${walletAddress}:${mint}`;
}