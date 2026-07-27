import TokenOutcome from "../../models/TokenOutcome.js";

import {
    buildPatternKey,
} from "./buildPatternKey.js";

import {
    updatePatternStats,
} from "./updatePatternStats.js";

export async function patternLearningService() {

    console.log(
        "🧠 Starting Pattern Learning..."
    );

    try {

        const outcomes =
            await TokenOutcome.find({

                trackingComplete: true,

                "learning.usedForTraining": false,

            });

        console.log(

            `📚 ${outcomes.length} outcome(s) ready for learning.`

        );

        for (const outcome of outcomes) {

            await learnOutcome(
                outcome
            );

        }

    } catch (error) {

        console.error(

            "❌ Pattern Learning Error:",

            error

        );

    }

}

async function learnOutcome(
    outcome
) {

    try {

        const key =
            buildPatternKey(
                outcome
            );

        await updatePatternStats({

            key,

            outcome,

        });

        if (!outcome.learning) {
    outcome.learning = {};
}

outcome.learning.usedForTraining = true;

outcome.learning.trainedAt =
    new Date();

        await outcome.save();

        console.log(

            `🧠 Learned pattern ${key}`

        );

    } catch (error) {

        console.error(

            `❌ Failed learning ${outcome.symbol}`,

            error

        );

    }

}