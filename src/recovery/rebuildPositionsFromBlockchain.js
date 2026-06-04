import User from "../../models/User.js";

import { TOKEN_PROGRAM_ID }
from "@solana/spl-token";

import { redis }
from "../utils/redis.js";

import LOG
from "../utils/logger.js";

import {
  positionKey,
  walletPositionsKey,
} from "../redis/positionKeys.js";

import {
  restoreTradingWallet,
} from "../services/walletService.js";

import {
  getDexScreenerPrice,
} from "../services/priceFeed.js";

import {
  getConnection,
} from "../utils/solanaConnection.js";

export async function rebuildPositionsFromBlockchain() {
  try {
    const connection =
      getConnection();

    const walletKeys =
      await redis.keys(
        "wallet:active:*"
      );

    if (walletKeys.length) {
      return false;
    }

    LOG.warn(
      "⚠️ Redis positions empty — rebuilding from blockchain"
    );

    const users = await User.find({
      tradingEnabled: true,
    });

    let rebuilt = 0;

    for (const user of users) {
      try {
        const wallet =
          restoreTradingWallet(user);

        const tokenAccounts =
          await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            {
              programId:
                TOKEN_PROGRAM_ID,
            }
          );

        for (const acc of tokenAccounts.value) {
          const info =
            acc.account.data.parsed.info;

          const mint =
            info?.mint;

          if (!mint) {
            continue;
          }

          const amount =
            Number(
              info.tokenAmount
                ?.uiAmount || 0
            );

          if (amount <= 0) {
            continue;
          }

          if (amount < 0.000001) {
            continue;
          }

          let currentPrice = 0;

          try {
            currentPrice =
              await getDexScreenerPrice(
                mint
              );

            if (
              !currentPrice ||
              Number.isNaN(
                currentPrice
              )
            ) {
              currentPrice = 0;
            }
          } catch {
            currentPrice = 0;
          }

          const estimatedSolAmount =
            Number(amount || 0) *
            Number(currentPrice || 0);

          await redis.sadd(
            walletPositionsKey(
              user.walletAddress
            ),
            mint
          );

          await redis.hset(
            positionKey(
              user.walletAddress,
              mint
            ),
            {
              walletAddress:
                user.walletAddress,

              mint,

              sourceChannel:
                "restore",

              recovered:
                "true",

              status:
                "open",

              solAmount:
                String(
                  estimatedSolAmount
                ),

              tokenAmount:
                String(amount),

              entryPrice:
                String(
                  currentPrice
                ),

              currentPrice:
                String(
                  currentPrice
                ),

              changePercent:
                "0",

              pnlSol:
                "0",

              buyTxid:
                "",

              tpStage:
                "0",

              highestPrice:
                String(
                  currentPrice
                ),

              openedAt:
                String(
                  Date.now()
                ),
            }
          );

          rebuilt++;

          LOG.info(
            {
              wallet:
                user.walletAddress,
              mint,
              amount,
              currentPrice,
            },
            "✅ Position rebuilt from blockchain"
          );
        }
      } catch (err) {
        LOG.error(
          {
            err,
            wallet:
              user.walletAddress,
          },
          "❌ Blockchain restore failed"
        );
      }
    }

    LOG.info(
      { rebuilt },
      "✅ Blockchain rebuild completed"
    );

    return true;
  } catch (err) {
    LOG.error(
      err,
      "❌ rebuildPositionsFromBlockchain failed"
    );

    return false;
  }
}

export default
  rebuildPositionsFromBlockchain;