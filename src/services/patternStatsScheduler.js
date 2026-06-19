import { rebuildPatternStats } from "./patternLearningService.js";

let schedulerRunning = false;

export async function runPatternStatsRebuild() {
  if (schedulerRunning) {
    console.log(
      "⏳ Pattern stats rebuild already running, skipping..."
    );
    return;
  }

  schedulerRunning = true;

  try {
    console.log(
      "📚 Rebuilding historical pattern statistics..."
    );

    await rebuildPatternStats();

    console.log(
      "✅ Pattern statistics rebuild completed"
    );
  } catch (err) {
    console.error(
      "❌ Pattern statistics rebuild failed:",
      err
    );
  } finally {
    schedulerRunning = false;
  }
}