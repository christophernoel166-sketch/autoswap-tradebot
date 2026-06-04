import User from "../../models/User.js";

import { TOKEN_PROGRAM_ID }
from "@solana/spl-token";

import { redis }
from "../utils/redis.js";

const LOG = console;

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

export async function scanWalletForMissingPositions() {
  try {
    const connection =
      getConnection();

    LOG.warn(
      "🧪 SCANNING WALLETS FOR MISSING POSITIONS"
    );

    const users = await User.find({
      tradingEnabled: true,
    });

    let restored = 0;

    for (const user of users) {

  if (!user.tradingWalletPublicKey) {
    LOG.warn(
      {
        walletAddress:
          user.walletAddress,
      },
      "⚠️ User has no trading wallet"
    );

    continue;
  }

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

          const balance = Number(
            info.tokenAmount.uiAmount || 0
          );

          if (balance <= 0) {
            continue;
          }

          const posKey =
            positionKey(
              user.walletAddress,
              mint
            );

          const exists =
            await redis.exists(posKey);

          if (exists) {
            continue;
          }

          const price =
            await getDexScreenerPrice(
              mint
            );

          const estimatedSolAmount =
            Number(balance || 0) *
            Number(price || 0);

          LOG.warn(
            {
              walletAddress:
                user.walletAddress,
              mint,
              balance,
              price,
            },
            "🚨 RECREATING MISSING POSITION"
          );

          await redis.hset(
            posKey,
            {
              walletAddress:
                user.walletAddress,

              mint,

              sourceChannel:
                "recovered",

              recovered:
                "true",

              status:
                "open",

              solAmount:
                String(
                  estimatedSolAmount
                ),

              tokenAmount:
                String(balance),

              entryPrice:
                String(price || 0),

              currentPrice:
                String(price || 0),

              changePercent:
                "0",

              pnlSol:
                "0",

              tpStage:
                "0",

              buyTxid:
                "",

              highestPrice:
                String(price || 0),

              openedAt:
                String(Date.now()),
            }
          );

          await redis.sadd(
            walletPositionsKey(
              user.walletAddress
            ),
            mint
          );

          restored++;

          LOG.warn(
            {
              walletAddress:
                user.walletAddress,
              mint,
              balance,
            },
            "✅ POSITION RESTORED"
          );
        }
      } catch (err) {
        LOG.error(
          {
            err,
            walletAddress:
              user.walletAddress,
          },
          "❌ Wallet scan failed"
        );
      }
    }

    LOG.info(
      {
        restored,
      },
      "✅ Missing-position scan complete"
    );
  } catch (err) {
    LOG.error(
      err,
      "❌ scanWalletForMissingPositions failed"
    );
  }
}

export default
  scanWalletForMissingPositions;