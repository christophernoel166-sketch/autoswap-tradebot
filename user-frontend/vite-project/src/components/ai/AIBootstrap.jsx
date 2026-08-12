import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import useAI from "../../hooks/useAI";

import {
    connectSocket,
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

    useEffect(() => {

        if (!connected || !publicKey) {

            detachAIListeners();

            return;
        }

        // ==========================================
        // Ensure Socket.IO exists FIRST
        // ==========================================

        const walletAddress =
            publicKey.toString();

        const socket =
            connectSocket(walletAddress);

        if (!socket) {

            console.warn(
                "[AI Bootstrap] Failed to initialize socket."
            );

            return;
        }

        // ==========================================
        // Attach AI listeners AFTER socket exists
        // ==========================================

        const attached =
            attachAIListeners(ai);

        if (!attached) {

            console.warn(
                "[AI Bootstrap] Failed to attach AI listeners."
            );

            return;
        }

        console.log(
            "[AI Bootstrap] AI socket initialized and listeners attached."
        );

        return () => {

            detachAIListeners();

        };

    }, [
        connected,
        publicKey,
        ai,
    ]);

    return null;
}