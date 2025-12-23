import express from "express";
import Trade from "../../models/Trade.js";

const router = express.Router();

/* -----------------------------------------------------------
 * POST /api/trades/record
 * Save executed trade
 * --------------------------------------------------------- */
router.post("/record", async (req, res) => {
  try {
    const d = req.body;

    const trade = await Trade.create({
      tgId: d.tgId || "unknown",          // walletAddress in wallet mode
      tradeType: d.tradeType || "auto",
      tokenMint: d.tokenMint,
      buyTxid: d.buyTxid || null,
      sellTxid: d.sellTxid || null,
      amountSol: Number(d.amountSol || 0),
      amountToken: Number(d.amountToken || 0),
      entryPrice: Number(d.entryPrice || 0),
      exitPrice: Number(d.exitPrice || 0),
      pnlSol:
        d.entryPrice && d.exitPrice
          ? Number(d.amountSol || 0) *
            ((Number(d.exitPrice) - Number(d.entryPrice)) /
              Number(d.entryPrice))
          : 0,
      status: d.status || "closed",
      source: d.source || "telegram",
      params: d.params || {},
      state: d.state || {},
      createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    });

    return res.json({ ok: true, trade });
  } catch (err) {
    console.error("❌ Error saving trade:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
 * GET /api/trades
 * Pagination, filtering, date range, sorting
 * --------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const {
      tgId,
      mint,
      type,
      from,
      to,
      page = 1,
      limit = 50,
      sort = "desc",
    } = req.query;

    const filter = {};

    if (tgId) filter.tgId = tgId;
    if (type) filter.tradeType = type;
    if (mint) filter.tokenMint = mint;

    // Date range filtering
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trades = await Trade.find(filter)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Trade.countDocuments(filter);

    return res.json({
      ok: true,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
      trades,
    });
  } catch (err) {
    console.error("❌ Error fetching trades:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
 * GET /api/trades/recent
 * Quick last X trades
 * --------------------------------------------------------- */
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10");

    const trades = await Trade.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, trades });
  } catch (err) {
    console.error("❌ Error fetching recent trades:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
 * GET /api/trades/summary
 * Returns:
 *   - total trades
 *   - win rate
 *   - total PnL
 *   - average PnL
 * --------------------------------------------------------- */
router.get("/summary", async (req, res) => {
  try {
    const { tgId } = req.query;

    if (!tgId)
      return res.status(400).json({ error: "tgId (walletAddress) required" });

    const trades = await Trade.find({ tgId }).lean();

    if (!trades.length) {
      return res.json({
        ok: true,
        trades: 0,
        pnlTotal: 0,
        pnlAvg: 0,
        winRate: 0,
      });
    }

    const pnlList = trades.map((t) => Number(t.pnlSol || 0));
    const pnlTotal = pnlList.reduce((a, b) => a + b, 0);
    const pnlAvg = pnlTotal / trades.length;
    const wins = pnlList.filter((x) => x > 0).length;
    const winRate = (wins / trades.length) * 100;

    return res.json({
      ok: true,
      trades: trades.length,
      pnlTotal: Number(pnlTotal.toFixed(6)),
      pnlAvg: Number(pnlAvg.toFixed(6)),
      winRate: Number(winRate.toFixed(2)),
    });
  } catch (err) {
    console.error("❌ Error generating summary:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
 * GET /api/trades/:id
 * SAFE ID VALIDATION
 * --------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: "Invalid trade ID format" });
    }

    const trade = await Trade.findById(id).lean();
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    return res.json({ ok: true, trade });
  } catch (err) {
    console.error("❌ Error fetching trade by ID:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
