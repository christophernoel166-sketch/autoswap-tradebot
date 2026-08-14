import { useEffect, useRef } from "react";
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

    // =====================================================
    // ALWAYS KEEP THE LATEST AI OBJECT
    // =====================================================

    const aiRef = useRef(ai);

    useEffect(() => {

        aiRef.current = ai;

    }, [ai]);

    // =====================================================
    // SOCKET LIFECYCLE
    //
    // IMPORTANT:
    // This effect intentionally does NOT depend on `ai`.
    // =====================================================

    useEffect(() => {

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

            console.error(
                "❌ [AI Bootstrap] Failed to initialize socket."
            );

            return;
        }

        // =================================================
        // STEP 2
        //
        // Attach listeners BEFORE socket connection.
        // =================================================

        const attached =
            attachAIListeners(
                aiRef
            );

        if (!attached) {

            console.error(
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
        // NOW connect.
        // =================================================

        const started =
            startSocket();

        if (!started) {

            console.error(
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
        // Only remove AI listeners.
        //
        // DO NOT disconnect the singleton socket here.
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