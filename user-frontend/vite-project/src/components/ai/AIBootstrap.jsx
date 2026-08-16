import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import useAI from "../../hooks/useAI";

import {
    connectSocket,
    startSocket,
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
    //
    // IMPORTANT:
    // DO NOT put `ai` in this dependency array.
    //
    // AI state changes must NOT restart the socket.
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
        // Create socket WITHOUT connecting.
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
        // Connect socket.
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
        // Only detach AI listeners.
        //
        // Do NOT disconnect the singleton socket here.
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
    ]);

    return null;
}