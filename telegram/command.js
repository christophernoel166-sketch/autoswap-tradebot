// telegram/commands.js
//
// Includes:
// ✅ /manual_buy <MINT> <SOL> tp/sl/tsl parameters
// ✅ /manual_sellall <ID|MINT>
// ✅ /manual_sellp <ID|MINT> <PCT>
// ✅ /manual_preview <MINT>
// ✅ /manual_cancel <MINT>
// ✅ Inline buttons: Sell 25%, Sell 50%, Sell All
//
// Requires:
// - trade engine helpers from engine/engine.js
// - settings helpers from telegram/ui.js

import { Markup } from "telegraf";
import {
  manualStartTrade,
  manualSellAllByKey,
  manualSellPartialByKey,
  manualSellPartialById,
  manualSellAllById,
  findTradeByMint
} from "../engine/engine.js";

import { userSettings } from "./ui.js";


// ------------------------
// HELPER: parse `tp1=20` style args
// ------------------------
function parseKvArgs(arr) {
  const out = {};
  for (const item of arr) {
    const [k, v] = item.split("=");
    if (!k || !v) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[k.toLowerCase()] = n;
  }
  return out;
}

// Convert kv to reusable params
export function kvToParams(kv) {
  return {
    TP1: kv.tp1 ?? userSettings.tp1 ?? 0,
    TP2: kv.tp2 ?? userSettings.tp2 ?? 0,
    TP3: kv.tp3 ?? userSettings.tp3 ?? 0,
    stopLoss: kv.sl ?? userSettings.sl ?? 20,
    trigger: kv.ttrig ?? userSettings.ttrig ?? 10,
    distance: kv.tdist ?? userSettings.tdist ?? 5
  };
}


// -----------------------
// REGISTER ALL COMMANDS
// -----------------------
export function registerCommands(bot) {

  // ========== HELP ==========
  bot.command("manual_help", (ctx) => {
    return ctx.reply([
      "Manual trading commands:",
      "",
      "/manual_buy <MINT> <SOL> [tp1=20 tp2=40 tp3=80 sl=20 ttrig=10 tdist=5]",
      "/manual_preview <MINT>",
      "/manual_cancel <MINT>",
      "/manual_sellall <ID|MINT>",
      "/manual_sellp <ID|MINT> <PCT>",
    ].join("\n"));
  });

  // ========== /manual_buy ==========
  bot.command("manual_buy", async (ctx) => {
    try {
      const parts = ctx.message.text.trim().split(/\s+/);

      if (parts.length < 3) {
        return ctx.reply("Usage: /manual_buy <MINT> <SOL> [tp1=.. tp2=.. sl=..]");
      }

      const mint = parts[1];
      const sol = Number(parts[2]);

      if (!Number.isFinite(sol) || sol <= 0) {
        return ctx.reply("❌ SOL must be > 0");
      }

      const kv = parseKvArgs(parts.slice(3));
      const params = kvToParams(kv);

      // Create new manual trade
      const id = await manualStartTrade(mint, sol, params, ctx);

      // Reply + inline sell buttons
      await ctx.reply(
        `✅ Manual buy placed. Tracking as T${id}.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Sell 25%", `sellp:${id}:25`),
            Markup.button.callback("Sell 50%", `sellp:${id}:50`),
            Markup.button.callback("Sell All", `sella:${id}`)
          ]
        ])
      );

    } catch (err) {
      return ctx.reply("❌ Manual buy failed: " + (err?.message || err));
    }
  });


  // ========== INLINE BUTTON: Partial Sell ==========
  bot.action(/^sellp:(\d+):(\d+)$/, async (ctx) => {
    try {
      const id = Number(ctx.match[1]);
      const pct = Number(ctx.match[2]);
      await manualSellPartialById(id, pct);
      await ctx.answerCbQuery(`Sold ${pct}%`);
    } catch (err) {
      await ctx.answerCbQuery("❌ Error");
    }
  });

  // ========== INLINE BUTTON: Sell All ==========
  bot.action(/^sella:(\d+)$/, async (ctx) => {
    try {
      const id = Number(ctx.match[1]);
      await manualSellAllById(id);
      await ctx.answerCbQuery("✅ Sold all");
    } catch {
      await ctx.answerCbQuery("❌ Error");
    }
  });


  // ========== /manual_sellall ==========
  bot.command("manual_sellall", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length !== 2) {
      return ctx.reply("Usage: /manual_sellall <ID|MINT>");
    }

    try {
      await manualSellAllByKey(parts[1]);
      return ctx.reply("✅ Sold all & stopped monitoring.");
    } catch (e) {
      return ctx.reply("❌ " + (e?.message || e));
    }
  });

  // ========== /manual_sellp ==========
  bot.command("manual_sellp", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);

    if (parts.length !== 3) {
      return ctx.reply("Usage: /manual_sellp <ID|MINT> <PCT>");
    }

    const key = parts[1];
    const pct = Number(parts[2]);

    if (!Number.isFinite(pct) || pct <= 0) {
      return ctx.reply("❌ Percent must be > 0");
    }

    try {
      await manualSellPartialByKey(key, pct);
      return ctx.reply(`✅ Sold ${pct}%`);
    } catch (err) {
      return ctx.reply("❌ " + (err?.message || err));
    }
  });


  // ========== /manual_preview ==========
  bot.command("manual_preview", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length !== 2) {
      return ctx.reply("Usage: /manual_preview <MINT>");
    }

    const mint = parts[1];
    const t = findTradeByMint(mint);

    if (!t) return ctx.reply("❌ No active trade for that mint.");

    const s = t.state;
    const params = t.params;

    const lines = [];
    lines.push(`Entry metric: ${s.entryMetric}`);
    lines.push(`Stop Loss: -${Math.abs(params.stopLossPct)}%`);
    lines.push(`Trailing Trigger: +${params.trailingTriggerPct}%`);
    lines.push(`Trailing Distance: ${params.trailingDistancePct}%`);

    if (params.tpMode > 0) {
      lines.push(
        `TPs: ${[params.TP1, params.TP2, params.TP3]
          .filter(Boolean)
          .map(v => v + "%")
          .join("  ")}`
      );
    }

    return ctx.reply(lines.join("\n"));
  });


  // ========== /manual_cancel (stop without selling) ==========
  bot.command("manual_cancel", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length !== 2) {
      return ctx.reply("Usage: /manual_cancel <MINT>");
    }

    const mint = parts[1];
    const t = findTradeByMint(mint);

    if (!t) return ctx.reply("❌ No active trade for that mint.");

    if (t.state?.pollHandle) clearInterval(t.state.pollHandle);

    t.state.status = "canceled";

    return ctx.reply("✅ Monitor canceled (no sell executed).");
  });
}
