// Seed the public Property collection straight from e-Stat, without needing
// a running server or a JWT. Usage: npm run estat:sync -- <statsDataId> [limit]
import mongoose from "mongoose";
import { MONGO_URI, ESTAT_APP_ID, ESTAT_STATS_DATA_ID } from "../utils/config.js";
import { EstatClient } from "../utils/estatClient.js";
import Property from "../models/property.model.js";
import EstatSyncState from "../models/estatSyncState.model.js";

async function main() {
  const statsDataId = process.argv[2] || ESTAT_STATS_DATA_ID;
  const limit = Number(process.argv[3] || 100);

  if (!ESTAT_APP_ID) {
    console.error("ESTAT_APP_ID is not set in .env");
    process.exit(1);
  }
  if (!statsDataId) {
    console.error("Usage: npm run estat:sync -- <statsDataId> [limit]");
    console.error('Find one with: npm run estat:search -- "空き家"');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB (${MONGO_URI})`);

  const state = await EstatSyncState.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" }, $set: { syncStatus: "syncing" } },
    { upsert: true, new: true },
  );

  try {
    const client = new EstatClient(ESTAT_APP_ID);
    console.log(`Fetching statsDataId=${statsDataId} (limit=${limit})...`);
    const raw = await client.fetchStatsData({ statsDataId, limit, startPosition: 1 });
    const listings = EstatClient.transformToAreaListings(raw, { statsDataId });

    console.log(`Transformed ${listings.length} area-level listing card(s).`);

    let added = 0;
    let updated = 0;
    for (const listingData of listings) {
      const result = await Property.findOneAndUpdate(
        { listingId: listingData.listingId, owner: null },
        { $set: listingData },
        { upsert: true, new: false },
      );
      if (result) updated++;
      else added++;
    }

    state.syncStatus = "completed";
    state.lastSyncedAt = new Date();
    state.lastError = null;
    state.lastStatsDataId = statsDataId;
    state.lastCount = listings.length;
    await state.save();

    console.log(`Done. Added ${added}, updated ${updated}, total ${listings.length}.`);
  } catch (err) {
    state.syncStatus = "failed";
    state.lastError = err.message;
    await state.save();
    console.error("Sync failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
