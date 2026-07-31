import { fetchLiquidityLockStatus } from "./src/scanner/fetchLiquidityLockStatus.js";

const TOKEN = "2j3z9Kr4PQuTZowLdWD2UCBFuArNgV3aRtsYkFDFpump";

async function main() {
    const result = await fetchLiquidityLockStatus(TOKEN);

    console.log(result);
}

main().catch(console.error);