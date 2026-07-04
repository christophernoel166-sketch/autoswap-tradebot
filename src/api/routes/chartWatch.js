import express from "express";

import {
  createChartWatch,
  getActiveChartWatches,
  stopChartWatch,
} from "../../services/chartWatchService.js";

import {
  serializeChartWatch,
  serializeChartWatchList,
} from "../../services/chartWatchSerializer.js";

import ChartWatch from "../../../models/ChartWatch.js";

const router = express.Router();

//
// =====================================================
// START MONITORING
// =====================================================
//

router.post("/start", async (req, res) => {
  try {
    const {
      walletAddress,
      token,
      chartEntry,
      forecast,
      autoTrade,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        error: "walletAddress is required",
      });
    }

    if (!token?.mintAddress) {
      return res.status(400).json({
        ok: false,
        error: "mintAddress is required",
      });
    }

    if (!chartEntry?.action) {
      return res.status(400).json({
        ok: false,
        error: "Invalid chart analysis",
      });
    }

    const watch = await createChartWatch({
      walletAddress,
      token,
      chartEntry,
      forecast,
      autoTrade,
    });

    return res.json({
      ok: true,
      watch: serializeChartWatch(watch),
    });

  } catch (err) {

    console.error("ChartWatch start error:", err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }
});

//
// =====================================================
// STOP MONITORING
// =====================================================
//

router.post("/stop", async (req, res) => {

  try {

    const { watchId } = req.body;

    if (!watchId) {
      return res.status(400).json({
        ok: false,
        error: "watchId required",
      });
    }

    const watch = await stopChartWatch(
      watchId
    );

    if (!watch) {
      return res.status(404).json({
        ok: false,
        error: "Watch not found",
      });
    }

    return res.json({
      ok: true,
      watch: serializeChartWatch(
        watch
      ),
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }

});

//
// =====================================================
// GET USER WATCHES
// =====================================================
//

router.get("/", async (req, res) => {

  try {

    const walletAddress =
      req.query.wallet;

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        error: "wallet query missing",
      });
    }

    const watches =
      await getActiveChartWatches(
        walletAddress
      );

    return res.json({
      ok: true,
      watches:
        serializeChartWatchList(
          watches
        ),
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }

});

//
// =====================================================
// STATS
// =====================================================
//

router.get("/stats", async (req, res) => {

  try {

    const [
      active,
      buyNow,
      invalidated,
      expired,
    ] = await Promise.all([

      ChartWatch.countDocuments({
        status: "ACTIVE",
      }),

      ChartWatch.countDocuments({
        status: "BUY_NOW",
      }),

      ChartWatch.countDocuments({
        status: "INVALIDATED",
      }),

      ChartWatch.countDocuments({
        status: "EXPIRED",
      }),

    ]);

    return res.json({

      ok: true,

      stats: {
        active,
        buyNow,
        invalidated,
        expired,
      },

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }

});

//
// =====================================================
// GET WATCH DETAILS
// =====================================================
//

router.get("/:id/details", async (req, res) => {

  try {

    const watch =
      await ChartWatch.findById(
        req.params.id
      );

    if (!watch) {
      return res.status(404).json({
        ok: false,
        error: "Watch not found",
      });
    }

    return res.json({

      ok: true,

      watch:
        serializeChartWatch(
          watch
        ),

      analysis:
        watch.analysisSnapshot,

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }

});

//
// =====================================================
// GET SINGLE WATCH
// =====================================================
//

router.get("/:id", async (req, res) => {

  try {

    const watch =
      await ChartWatch.findById(
        req.params.id
      );

    if (!watch) {
      return res.status(404).json({
        ok: false,
        error: "Watch not found",
      });
    }

    return res.json({

      ok: true,

      watch:
        serializeChartWatch(
          watch
        ),

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });

  }

});

export default router;