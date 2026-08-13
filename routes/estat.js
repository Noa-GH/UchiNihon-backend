import express from "express";
import {
  getEstatStatus,
  searchEstatDatasets,
  syncEstatData,
} from "../controllers/estat.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// All e-Stat routes require a logged-in user (a lightweight guard against
// random/unauthenticated sync triggers). They use the server's own
// ESTAT_APP_ID — no per-user e-Stat credentials are involved.
router.use(auth);

/**
 * @route GET /api/estat/status
 * @desc Whether the server is configured for e-Stat, plus last sync info.
 * @returns { configured, lastSyncedAt, syncStatus, lastError, lastStatsDataId, lastCount }
 */
router.get("/estat/status", getEstatStatus);

/**
 * @route GET /api/estat/datasets
 * @desc Search e-Stat's table catalog to discover a statsDataId.
 * @query { keyword: string, limit?: number }
 * @returns { count: number, datasets: array }
 */
router.get("/estat/datasets", searchEstatDatasets);

/**
 * @route POST /api/estat/sync
 * @desc Fetch a statistics table from e-Stat and upsert it into the public
 *       Property collection served by GET /api/listings.
 * @body { statsDataId?: string, limit?: number, startPosition?: number }
 * @returns { message, statsDataId, propertiesAdded, propertiesUpdated, totalProcessed }
 */
router.post("/estat/sync", syncEstatData);

export default router;
