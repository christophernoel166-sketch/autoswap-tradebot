import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
} from "react";

import { aiReducer } from "./AIReducer";
import { initialAIState } from "./AIInitialState";
import { AI_ACTIONS } from "./AIActions";

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [aiState, dispatch] = useReducer(aiReducer, initialAIState);

  /* ===============================
     SYSTEM
  =============================== */

  const updateSystem = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_SYSTEM,
      payload,
    });
  }, []);

  /* ===============================
     PORTFOLIO
  =============================== */

  const updatePortfolio = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_PORTFOLIO,
      payload,
    });
  }, []);

  /* ===============================
     MARKET
  =============================== */

  const updateMarket = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_MARKET,
      payload,
    });
  }, []);

  /* ===============================
     PIPELINE
  =============================== */

  const updatePipeline = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_PIPELINE,
      payload,
    });
  }, []);

  /* ===============================
     POSITION METRICS
  =============================== */

  const updatePositionMetrics = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_POSITION_METRICS,
      payload,
    });
  }, []);

  /* ===============================
     ACTIVITY
  =============================== */

  const addActivity = useCallback((activity) => {
    dispatch({
      type: AI_ACTIONS.ADD_ACTIVITY,
      payload: activity,
    });
  }, []);

  const clearActivity = useCallback(() => {
    dispatch({
      type: AI_ACTIONS.CLEAR_ACTIVITY,
    });
  }, []);

  /* ===============================
     DIAGNOSTICS
  =============================== */

  const updateDiagnostics = useCallback((payload) => {
    dispatch({
      type: AI_ACTIONS.UPDATE_DIAGNOSTICS,
      payload,
    });
  }, []);

  /* ===============================
     RESET
  =============================== */

  const resetAI = useCallback(() => {
    dispatch({
      type: AI_ACTIONS.RESET_AI,
    });
  }, []);

  const value = useMemo(
    () => ({
      aiState,

      updateSystem,
      updatePortfolio,
      updateMarket,
      updatePipeline,
      updatePositionMetrics,

      addActivity,
      clearActivity,

      updateDiagnostics,

      resetAI,
    }),
    [
      aiState,

      updateSystem,
      updatePortfolio,
      updateMarket,
      updatePipeline,
      updatePositionMetrics,

      addActivity,
      clearActivity,

      updateDiagnostics,

      resetAI,
    ]
  );

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContext);

  if (!context) {
    throw new Error("useAIContext must be used inside AIProvider");
  }

  return context;
}