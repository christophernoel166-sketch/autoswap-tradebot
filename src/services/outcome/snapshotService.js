import TokenOutcomeSnapshot from "../../../models/TokenOutcomeSnapshot.js";

export async function saveOutcomeSnapshot(snapshot) {

    try {

        if (!snapshot) {

            throw new Error(
                "Snapshot data is required."
            );

        }

        return await TokenOutcomeSnapshot.create(
            snapshot
        );

    } catch (error) {

        console.error(
            "❌ Failed to save outcome snapshot:",
            error
        );

        return null;

    }

}