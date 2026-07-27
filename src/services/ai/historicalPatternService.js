import PatternStats from "../../models/PatternStats.js";

import {
    buildPatternKey,
} from "../learning/buildPatternKey.js";

export async function getHistoricalPattern(
    tokenAnalysis
) {

    try {

        const key =
            buildPatternKey(
                tokenAnalysis
            );

        const pattern =
            await PatternStats.findOne({
                key,
            }).lean();

        if (!pattern) {

            return {

                found: false,

                key,

                samples: 0,

            };

        }

        return {

            found: true,

            key,

            samples:
                pattern.samples,

            confidenceScore:
                pattern.confidenceScore,

            winRate:
                pattern.winRate,

            moonshotRate:
                pattern.moonshotRate,

            lossRate:
                pattern.lossRate,

            averagePeakReturn:
                pattern.averagePeakReturn,

            averageMinutesToPeak:
                pattern.averageMinutesToPeak,

            averageCollapseTime:
                pattern.averageCollapseTime,

            averageCollapsePercent:
                pattern.averageCollapsePercent,

            metadata:
                pattern.metadata,

        };

    }

    catch (error) {

        console.error(

            "Historical Pattern Lookup Error:",

            error

        );

        return {

            found: false,

            error:
                error.message,

        };

    }

}