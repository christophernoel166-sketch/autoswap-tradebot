/**
 * ===================================================
 * POST /api/users
 * Ensure user exists (idempotent)
 * Auto-creates per-user trading wallet if missing
 * ===================================================
 */
router.post("/", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress_required" });
    }

    let user = await User.findOne({ walletAddress });

    // ===================================================
    // 🆕 USER DOES NOT EXIST → CREATE + WALLET
    // ===================================================
    if (!user) {
      const {
        publicKey,
        encryptedPrivateKey,
        iv,
      } = generateTradingWallet();

      user = await User.create({
        walletAddress,

        tradingWalletPublicKey: publicKey,
        tradingWalletEncryptedPrivateKey: encryptedPrivateKey,
        tradingWalletIv: iv,

        createdAt: new Date(),
        subscribedChannels: [],
        tradingEnabled: false,

        // Trading defaults
        solPerTrade: 0.01,
        stopLoss: 10,
        trailingTrigger: 5,
        trailingDistance: 3,
        tp1: 10,
        tp1SellPercent: 25,
        tp2: 20,
        tp2SellPercent: 35,
        tp3: 30,
        tp3SellPercent: 40,

        maxSlippagePercent: 2,
        mevProtection: true,
      });

      console.log("✅ Created new user with trading wallet:", walletAddress);
      console.log("🔐 Trading wallet:", publicKey);
    }

    // ===================================================
    // 👤 USER EXISTS BUT HAS NO TRADING WALLET → CREATE ONE
    // ===================================================
    if (!user.tradingWalletPublicKey) {
      const {
        publicKey,
        encryptedPrivateKey,
        iv,
      } = generateTradingWallet();

      user.tradingWalletPublicKey = publicKey;
      user.tradingWalletEncryptedPrivateKey = encryptedPrivateKey;
      user.tradingWalletIv = iv;

      await user.save();

      console.log(
        "🔐 Trading wallet auto-created for existing user:",
        walletAddress
      );
      console.log("🔐 Trading wallet:", publicKey);
    }

    return res.json({
      ok: true,
      user: sanitizeUser(user),
    });

  } catch (err) {
    console.error("❌ ensure user error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});
export default router;