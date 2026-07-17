// src/context/ai/AIReducer.js

import { initialAIState } from "./AIInitialState";
import { AI_ACTIONS } from "./AIActions";

export function aiReducer(state, action) {
    switch (action.type) {

        case AI_ACTIONS.UPDATE_SYSTEM:
            return {
                ...state,
                system: {
                    ...state.system,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.UPDATE_PORTFOLIO:
            return {
                ...state,
                portfolio: {
                    ...state.portfolio,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.UPDATE_MARKET:
            return {
                ...state,
                market: {
                    ...state.market,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.UPDATE_PIPELINE:
            return {
                ...state,
                pipeline: {
                    ...state.pipeline,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.UPDATE_POSITION_METRICS:
            return {
                ...state,
                positions: {
                    ...state.positions,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.ADD_ACTIVITY:
            return {
                ...state,
                activity: [
                    action.payload,
                    ...state.activity,
                ].slice(0, 100),
            };

        case AI_ACTIONS.CLEAR_ACTIVITY:
            return {
                ...state,
                activity: [],
            };

        case AI_ACTIONS.UPDATE_DIAGNOSTICS:
            return {
                ...state,
                diagnostics: {
                    ...state.diagnostics,
                    ...action.payload,
                },
            };

        case AI_ACTIONS.RESET_AI:
            return initialAIState;

        default:
            return state;
    }
}