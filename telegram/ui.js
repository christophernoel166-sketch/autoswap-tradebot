// telegram/ui.js
import { Markup } from "telegraf";

// In-memory settings structure (exported so main file can read defaults)
export const userSettings = {
  wallet: null,
  sol: 0.01,
  tp1: null,
  tp2: null,
  tp3: null,
  sl: 20,
  ttrig: 10,
  tdist: 5,
};

// Keys currently being edited by user
export const pendingEdits = new Map();

// Public: register all UI interactions on a bot instance
export function registerSettingsUI(bot) {
  bot.command("menu", (ctx) => showSettings(ctx, "WALLET"));
  bot.command("settings", (ctx) => showSettings(ctx, "WALLET"));

  // Tab switching
  bot.action(/^tab:(WALLET|BUY|SELL)$/, async (ctx) => {
    ctx.answerCbQuery();
    return showSettings(ctx, ctx.match[1]);
  });

  // Editing actions
  bot.action(/^edit:(wallet|sol|tp1|tp2|tp3|sl|ttrig|tdist)$/, async (ctx) => {
    ctx.answerCbQuery();
    const key = ctx.match[1];
    pendingEdits.set(String(ctx.from.id), key);
    return ctx.reply("✍️ Send a value for " + key);
  });

  // Text handler for edit responses
  bot.on("text", async (ctx) => {
    const userId = String(ctx.from.id);
    const pendingKey = pendingEdits.get(userId);
    if (!pendingKey) return; // not editing

    const value = ctx.message.text.trim();
    try {
      saveSetting(pendingKey, value);
      pendingEdits.delete(userId);
      await ctx.reply("✅ Saved!");
      const tab = resolveTabForKey(pendingKey);
      return showSettings(ctx, tab);
    } catch (err) {
      return ctx.reply("❌ Invalid value. Try again.");
    }
  });
}

// ===== helpers (internal) =====
function saveSetting(key, value) {
  if (key === "wallet") {
    userSettings.wallet = value;
    return;
  }
  const number = parseFloat(value);
  if (!Number.isFinite(number)) throw new Error("Invalid numeric value");
  userSettings[key] = number;
}

function resolveTabForKey(key) {
  if (key === "wallet") return "WALLET";
  if (key === "sol") return "BUY";
  return "SELL";
}

// Public: render the tabbed settings UI
export async function showSettings(ctx, tab = "WALLET") {
  const wallet = userSettings.wallet || "<not set>";
  const sol = userSettings.sol;

  const header = "⚙️ <b>AutoSwap Control Center</b>\nChoose a tab and tap ✏️ to edit";

  const tabs = Markup.inlineKeyboard([
    [
      Markup.button.callback(tab === "WALLET" ? "🧾 [Wallet]" : "🧾 Wallet", "tab:WALLET"),
      Markup.button.callback(tab === "BUY" ? "🛒 [Buy]" : "🛒 Buy", "tab:BUY"),
      Markup.button.callback(tab === "SELL" ? "📉 [Sell]" : "📉 Sell", "tab:SELL"),
    ],
  ]);

  let body = "";
  let buttons;

  if (tab === "WALLET") {
    body = `

<b>Wallet</b>
💼 Address: <code>${wallet}</code>`;
    buttons = Markup.inlineKeyboard([
      [Markup.button.callback("✏️ Set Wallet", "edit:wallet")],
      [Markup.button.callback("🛒 Buy", "tab:BUY"), Markup.button.callback("📉 Sell", "tab:SELL")],
    ]);
  } else if (tab === "BUY") {
    body = `

<b>Buy Settings</b>
💵 SOL per manual buy: <b>${sol}</b>`;
    buttons = Markup.inlineKeyboard([
      [Markup.button.callback("✏️ Edit SOL", "edit:sol")],
      [Markup.button.callback("🧾 Wallet", "tab:WALLET"), Markup.button.callback("📉 Sell", "tab:SELL")],
    ]);
  } else {
    body = `

<b>Sell Settings</b>
🎯 TP1 = <b>${userSettings.tp1 ?? "-"}</b>%
🎯 TP2 = <b>${userSettings.tp2 ?? "-"}</b>%
🎯 TP3 = <b>${userSettings.tp3 ?? "-"}</b>%

🛡️ Stop-Loss = <b>${userSettings.sl}%</b>
🏁 Trailing Trigger = <b>${userSettings.ttrig}%</b>
📉 Trailing Distance = <b>${userSettings.tdist}%</b>`;
    buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback("✏️ TP1", "edit:tp1"),
        Markup.button.callback("✏️ TP2", "edit:tp2"),
        Markup.button.callback("✏️ TP3", "edit:tp3"),
      ],
      [
        Markup.button.callback("✏️ SL", "edit:sl"),
        Markup.button.callback("✏️ Trigger", "edit:ttrig"),
        Markup.button.callback("✏️ Distance", "edit:tdist"),
      ],
      [Markup.button.callback("🧾 Wallet", "tab:WALLET"), Markup.button.callback("🛒 Buy", "tab:BUY")],
    ]);
  }

  const html = { parse_mode: "HTML" };
  const text = `${header}${body}`;

  if (ctx.update?.callback_query) {
    try {
      await ctx.editMessageText(text, { ...html, ...tabs.reply_markup });
    } catch {
      await ctx.reply(text, tabs);
    }
    try {
      await ctx.editMessageReplyMarkup(buttons.reply_markup);
    } catch {
      await ctx.reply(" ", buttons);
    }
  } else {
    await ctx.reply(text, tabs);
    await ctx.reply(" ", buttons);
  }
}
