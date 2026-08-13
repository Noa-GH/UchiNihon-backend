// Discover a real statsDataId to sync, without needing a JWT/HTTP round trip.
// Usage: npm run estat:search -- "空き家" [limit]
import { ESTAT_APP_ID } from "../utils/config.js";
import { EstatClient } from "../utils/estatClient.js";

async function main() {
  const keyword = process.argv[2];
  const limit = Number(process.argv[3] || 20);

  if (!ESTAT_APP_ID) {
    console.error("ESTAT_APP_ID is not set in .env");
    process.exit(1);
  }
  if (!keyword) {
    console.error('Usage: npm run estat:search -- "空き家" [limit]');
    process.exit(1);
  }

  const client = new EstatClient(ESTAT_APP_ID);
  const datasets = await client.searchDatasets({ keyword, limit });

  if (!datasets.length) {
    console.log("No datasets found for that keyword.");
    return;
  }

  console.log(`Found ${datasets.length} dataset(s):\n`);
  for (const d of datasets) {
    console.log(`${d.statsDataId}  [${d.govOrg}] ${d.statName} — ${d.title || d.mainCategory}`);
  }
  console.log("\nSync one with: npm run estat:sync -- <statsDataId>");
}

main().catch((err) => {
  console.error("Search failed:", err.message);
  process.exitCode = 1;
});
