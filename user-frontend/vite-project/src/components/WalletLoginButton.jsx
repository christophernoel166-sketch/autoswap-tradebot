import React from "react";
import bs58 from "bs58";

export default function WalletLoginButton({ apiBase, onLogin }) {
  const loginWithWallet = async () => {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        alert("Phantom wallet not detected. Please install Phantom.");
        return;
      }

      // 1️⃣ CONNECT WALLET
      const resp = await window.solana.connect();
      const wallet = resp.publicKey.toString();

      // 2️⃣ REQUEST NONCE
      const nonceRes = await fetch(`${apiBase}/auth/wallet/nonce/${wallet}`);
      const nonceData = await nonceRes.json();

      if (!nonceData?.nonce) {
        alert("Failed to request nonce.");
        return;
      }

      const message = new TextEncoder().encode(nonceData.nonce);

      // 3️⃣ SIGN MESSAGE
      let signed;
      try {
        signed = await window.solana.signMessage(message, "utf8");
      } catch (err) {
        console.error("Phantom signature error:", err);
        alert("Signature rejected.");
        return;
      }

      // Phantom returns either { signature } or Uint8Array
      const signatureBytes = signed.signature || signed;
      const signatureBase58 = bs58.encode(signatureBytes);

      // 4️⃣ VERIFY SIGNATURE ON BACKEND
      const verifyRes = await fetch(`${apiBase}/auth/wallet/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, signature: signatureBase58 }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData?.ok) {
        alert("Login failed: " + (verifyData.error || "Unknown error"));
        return;
      }

      // 5️⃣ STORE SESSION LOCALLY
      localStorage.setItem("autoswap_token", verifyData.token);
      localStorage.setItem("autoswap_user", JSON.stringify(verifyData.user));

      // 6️⃣ AUTH SUCCESS
      onLogin(verifyData.user);

    } catch (err) {
      console.error("Wallet login error:", err);
      alert("Wallet login failed.");
    }
  };

  return (
    <button
      onClick={loginWithWallet}
      className="px-4 py-2 mt-4 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
    >
      Connect Wallet & Login
    </button>
  );
}
