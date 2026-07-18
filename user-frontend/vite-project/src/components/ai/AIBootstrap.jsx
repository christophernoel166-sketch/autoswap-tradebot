import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import useAI from "../../hooks/useAI";

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

        attachAIListeners(ai);

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