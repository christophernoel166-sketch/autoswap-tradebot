import axios from "axios";

const base = "https://quote-api.jup.ag";
const path = "/v7/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=10000000"; 
// SOL -> USDC on mainnet

async function test() {
  console.log("🚀 Testing Jupiter API connectivity...");

  try {
    const { data } = await axios.get(base + path);
    console.log("✅ Success!");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("❌ Failed:", err.response.statusText, err.response.status, err.response.data);
    } else {
      console.error("❌ Network error:", err.message);
    }
  }
}

test();
