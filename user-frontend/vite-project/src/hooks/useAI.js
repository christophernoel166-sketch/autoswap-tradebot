// src/hooks/useAI.js

import { useAIContext } from "../context/ai/AIContext";

export default function useAI() {
  return useAIContext();
}