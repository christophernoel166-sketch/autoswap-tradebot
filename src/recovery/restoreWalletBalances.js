import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import User from "../../models/User.js";

import { redis } from "../utils/redis.js";
import {
  connection,
} from "../services/solanaConnection.js";

import {
  restoreTradingWallet,
} from "../services/walletService.js";

import {
  positionKey,
  walletPositionsKey,
} from "../redis/positionKeys.js";

import {
  getDexScreenerPrice,
} from "../services/priceFeed.js";

import LOG from "../utils/logger.js";

export async function restoreWalletBalances() {
  try {
    LOG.info("🪙 Restoring wallet balances...");

    const users = await User.find({
      walletAddress: {
        $exists: true,
        $ne: null,
      },
    });

    let restored = 0;

    for (const user of users) {
      try {
        const walletAddress =
          user.walletAddress;

        const wallet =
          restoreTradingWallet(user);

        const tokenAccounts =
          await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            {
              programId: TOKEN_PROGRAM_ID,
            }
          );

        for (const item of tokenAccounts.value) {
          try {
            const parsed =
              item.account.data.parsed.info;

            const mint = parsed.mint;

            const balance =
              Number(
                parsed.tokenAmount.uiAmount || 0
              );

            // skip empty balances
            if (balance <= 0) {
              continue;
            }

            // skip SOL + stablecoins
            if (
              mint === WSOL_MINT ||
              mint === USDC_MINT
            ) {
              continue;
            }

            const posKey =
              positionKey(
                walletAddress,
                mint
              );

            const existing =
              await redis.hgetall(posKey);

            // already restored
            if (
              existing &&
              existing.status === "open"
            ) {
              continue;
            }

            LOG.info(
              {
                walletAddress,
                mint,
                balance,
              },
              "🪙 Found orphan wallet token"
            );

            const market =
              await fetchTokenMarketData(
                mint
              );

            const entryPrice =
              Number(
                market?.token?.priceNative || 0
              );

            const state =
              await ensureMonitor(mint);

            state.users.set(
              String(walletAddress),
              {
                walletAddress,
                wallet,

                tpStage: 0,

                buyTxid: "recovered",

                solAmount: 0,

                tokenAmount: balance,

                entryPrice,

                sourceChannel:
                  "wallet_recovery",

                slippageBps: 500,

                profile: {
                  tp1Percent:
                    Number(user.tp1 || 25),

                  tp1SellPercent:
                    Number(
                      user.tp1SellPercent || 25
                    ),

                  tp2Percent:
                    Number(user.tp2 || 50),

                  tp2SellPercent:
                    Number(
                      user.tp2SellPercent || 25
                    ),

                  tp3Percent:
                    Number(user.tp3 || 100),

                  tp3SellPercent:
                    Number(
                      user.tp3SellPercent || 50
                    ),

                  stopLossPercent:
                    Number(
                      user.stopLoss || 20
                    ),

                  trailingDistancePercent:
                    Number(
                      user.trailingDistance || 10
                    ),

                  trailingActivationPercent:
                    Number(
                      user.trailingTrigger || 5
                    ),
                },
              }
            );

            await redis.sadd(
              walletPositionsKey(
                walletAddress
              ),
              mint
            );

            await redis.hset(posKey, {
              walletAddress,
              mint,

              status: "open",

              tokenAmount: String(balance),

              entryPrice: String(entryPrice),

              sourceChannel:
                "wallet_recovery",

              tpStage: "0",

              highestPrice:
                String(entryPrice),

              openedAt:
                String(Date.now()),
            });

            restored++;

          } catch (err) {
            LOG.error(
              { err },
              "❌ Failed restoring token balance"
            );
          }
        }

      } catch (err) {
        LOG.error(
          { err },
          "❌ Failed restoring wallet"
        );
      }
    }

    LOG.info(
      { restored },
      "🪙 Wallet balance recovery complete"
    );

  } catch (err) {
    LOG.error(
      err,
      "❌ restoreWalletBalances failed"
    );
  }
}