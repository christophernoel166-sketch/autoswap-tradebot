
import "dotenv/config";
import { collectVolumeSnapshot } from "./volumeMonitorService.js";

const tokenMint = process.argv[2];

if (!tokenMint) {
  console.error(
    "Usage: node src/services/testVolumeMonitorService.js <TOKEN_MINT>"
  );
  process.exitCode = 1;
} else {
  try {
    const snapshot = await collectVolumeSnapshot(tokenMint);

    console.log(
      JSON.stringify(snapshot, null, 2)
    );
  } catch (error) {
    console.error(
      "Volume collector test failed:",
      error?.response?.data || error.message || error
    );
    process.exitCode = 1;
  }
}
