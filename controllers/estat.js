import EstatSyncState from "../models/estatSyncState.model.js";
import Property from "../models/property.model.js";
import { EstatClient } from "../utils/estatClient.js";
import { ESTAT_APP_ID, ESTAT_STATS_DATA_ID } from "../utils/config.js";
import { BadRequestError, ServiceUnavailableError } from "../utils/errors.js";

const getSyncState = () =>
  EstatSyncState.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, new: true },
  );

const requireAppId = (next) => {
  if (!ESTAT_APP_ID) {
    next(
      new ServiceUnavailableError(
        "ESTAT_APP_ID is not configured on the server. Register a free appId at https://www.e-stat.go.jp/ and set it in .env.",
      ),
    );
    return false;
  }
  return true;
};

/**
 * GET /api/estat/status
 * Whether the server is configured for e-Stat, plus last sync info.
 */
export const getEstatStatus = async (req, res, next) => {
  try {
    const state = await getSyncState();
    res.json({
      configured: Boolean(ESTAT_APP_ID),
      lastSyncedAt: state.lastSyncedAt,
      syncStatus: state.syncStatus,
      lastError: state.lastError,
      lastStatsDataId: state.lastStatsDataId,
      lastCount: state.lastCount,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/estat/datasets?keyword=空き家&limit=20
 * Search e-Stat's table catalog to discover a statsDataId to sync.
 */
export const searchEstatDatasets = async (req, res, next) => {
  try {
    if (!requireAppId(next)) return;

    const { keyword, limit } = req.query;
    if (!keyword) {
      return next(new BadRequestError("keyword query parameter is required"));
    }

    const client = new EstatClient(ESTAT_APP_ID);
    const datasets = await client.searchDatasets({
      keyword,
      limit: limit ? Number(limit) : 20,
    });

    res.json({ count: datasets.length, datasets });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/estat/sync
 * Fetch a statistics table from e-Stat, transform it into area-level
 * listing cards, and upsert them into the public Property collection
 * (owner: null) that GET /api/listings serves to the frontend.
 */
export const syncEstatData = async (req, res, next) => {
  try {
    if (!requireAppId(next)) return;

    const {
      statsDataId = ESTAT_STATS_DATA_ID,
      limit = 100,
      startPosition = 1,
    } = req.body;

    if (!statsDataId) {
      return next(
        new BadRequestError(
          "statsDataId is required (pass it in the body, or set ESTAT_STATS_DATA_ID). " +
            "Use GET /api/estat/datasets?keyword=... to find one.",
        ),
      );
    }

    const state = await getSyncState();
    state.syncStatus = "syncing";
    await state.save();

    try {
      const client = new EstatClient(ESTAT_APP_ID);
      const raw = await client.fetchStatsData({ statsDataId, limit, startPosition });
      const listings = EstatClient.transformToAreaListings(raw, { statsDataId });

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

      res.json({
        message: "e-Stat data synced successfully",
        statsDataId,
        propertiesAdded: added,
        propertiesUpdated: updated,
        totalProcessed: listings.length,
      });
    } catch (syncError) {
      state.syncStatus = "failed";
      state.lastError = syncError.message;
      await state.save();
      return next(syncError);
    }
  } catch (err) {
    return next(err);
  }
};
