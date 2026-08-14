import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import useAI from "../../hooks/useAI";

import {
    connectSocket,
    startSocket,
    disconnectSocket,
} from "../../services/socket";

import {
    attachAIListeners,
    detachAIListeners,
} from "../../services/aiSocket";

export default function AIBootstrap() {

    const ai = useAI();

    const {
        connected,
        publicKey,
    } = useWallet();

    // =================================================
    // SOCKET + AI INITIALIZATION
    // =================================================

    useEffect(() => {

        // =================================================
        // WALLET NOT CONNECTED
        // =================================================

        if (
            !connected ||
            !publicKey
        ) {

            console.log(
                "🧠 [AI Bootstrap] Wallet not connected."
            );

            detachAIListeners();

            return;
        }

        // =================================================
        // WALLET ADDRESS
        // =================================================

        const walletAddress =
            publicKey.toString();

        console.log(
            "🧠 [AI Bootstrap] Initializing AI socket",
            {
                walletAddress,
            }
        );

        // =================================================
        // STEP 1
        //
        // Create the socket WITHOUT connecting.
        //
        // This is critical because we need to attach
        // AI listeners before the socket can receive
        // the initial ai_state event.
        // =================================================

        const socket =
            connectSocket(
                walletAddress,
                {
                    connectNow:
                        false,
                }
            );

        if (!socket) {

            console.warn(
                "❌ [AI Bootstrap] Failed to initialize socket."
            );

            return;
        }

        // =================================================
        // STEP 2
        //
        // Attach AI listeners BEFORE connecting.
        // =================================================

        const attached =
            attachAIListeners(
                ai
            );

        if (!attached) {

            console.warn(
                "❌ [AI Bootstrap] Failed to attach AI listeners."
            );

            return;
        }

        console.log(
            "✅ [AI Bootstrap] AI listeners attached BEFORE socket connection."
        );

        // =================================================
        // STEP 3
        //
        // Now connect.
        //
        // Socket connect → join-wallet → server sends
        // latest ai_state → frontend listener receives it.
        // =================================================

        const started =
            startSocket();

        if (!started) {

            console.warn(
                "❌ [AI Bootstrap] Failed to start socket."
            );

            return;
        }

        console.log(
            "🚀 [AI Bootstrap] AI socket fully initialized",
            {
                walletAddress,
            }
        );

        // =================================================
        // CLEANUP
        //
        // IMPORTANT:
        // Do NOT disconnect the singleton socket here.
        //
        // React may rerun this effect when `ai` changes.
        // We only replace the AI listeners.
        // =================================================

        return () => {

            console.log(
                "🧹 [AI Bootstrap] Cleaning up AI listeners."
            );

            detachAIListeners();
        };

    }, [
        connected,
        publicKey,
        ai,
    ]);

    return null;
}