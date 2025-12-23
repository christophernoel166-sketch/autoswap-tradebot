const API = "http://localhost:4000/api/channels";

export async function addChannel(wallet, channel) {
  const res = await fetch(`${API}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, channel }),
  });

  return res.json();
}


export async function getUser(wallet) {
  const res = await fetch(`http://localhost:4000/api/users/byWallet/${wallet}`);
  return res.json();
}
