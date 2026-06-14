import express from "express";
import {
  authenticateEstat,
  getEstatStatus,
  syncEstatData,
  getAvailableDatasets,
  removeEstatCredentials,
  getEstatProperties,
} from "../controllers/estat.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// All e-Stat routes require authentication
router.use(auth);

/**
 * @route POST /api/estat/auth
 * @desc Authenticate with e-Stat API by providing appId and apiKey
 * @body { appId: string, apiKey: string }
 * @returns { message: string, credential: object }
 */
router.post("/estat/auth", authenticateEstat);

/**
 * @route GET /api/estat/status
 * @desc Get current e-Stat authentication status and sync information
 * @returns { isAuthenticated: boolean, lastSyncedAt: date, syncStatus: string, lastError: string }
 */
router.get("/estat/status", getEstatStatus);

/**
 * @route POST /api/estat/sync
 * @desc Sync housing data from e-Stat and save as properties
 * @body { prefecture?: string, limit?: number, offset?: number }
 * @returns { message: string, propertiesAdded: number, propertiesUpdated: number, totalProcessed: number }
 */
router.post("/estat/sync", syncEstatData);

/**
 * @route GET /api/estat/datasets
 * @desc List all available housing datasets from e-Stat
 * @returns { datasets: array }
 */
router.get("/estat/datasets", getAvailableDatasets);

/**
 * @route GET /api/estat/properties
 * @desc Get all properties synced from e-Stat
 * @query { prefecture?: string, sortBy?: string, order?: 'asc' | 'desc' }
 * @returns { count: number, properties: array }
 */
router.get("/estat/properties", getEstatProperties);

/**
 * @route DELETE /api/estat/credentials
 * @desc Remove e-Stat credentials for the current user
 * @returns { message: string }
 */
router.delete("/estat/credentials", removeEstatCredentials);

export default router;
