import EstatCredential from "../models/estatCredential.model.js";
import Property from "../models/property.model.js";
import { EstatClient } from "../utils/estatClient.js";
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from "../utils/errors.js";

/**
 * POST /api/estat/auth
 * Authenticate and store e-Stat API credentials
 */
export const authenticateEstat = async (req, res, next) => {
  try {
    const { appId, apiKey } = req.body;

    if (!appId || !apiKey) {
      return next(new BadRequestError("appId and apiKey are required"));
    }

    // Verify credentials with e-Stat
    const client = new EstatClient(appId, apiKey);
    const verification = await client.verifyCredentials();

    if (!verification.valid) {
      return next(
        new UnauthorizedError(
          `Invalid e-Stat credentials: ${verification.error}`,
        ),
      );
    }

    // Check if user already has credentials
    let credential = await EstatCredential.findOne({
      userId: req.user._id,
    });

    if (credential) {
      // Update existing credentials
      credential.appId = appId;
      credential.apiKey = apiKey;
      credential.isActive = true;
      credential.lastError = null;
      await credential.save();
    } else {
      // Create new credential document
      credential = await EstatCredential.create({
        userId: req.user._id,
        appId,
        apiKey,
        isActive: true,
      });
    }

    res.status(201).json({
      message: "e-Stat credentials authenticated successfully",
      credential: {
        id: credential._id,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/estat/status
 * Get current e-Stat authentication status and sync info
 */
export const getEstatStatus = async (req, res, next) => {
  try {
    const credential = await EstatCredential.findOne({
      userId: req.user._id,
    }).select("-apiKey");

    if (!credential) {
      return next(
        new NotFoundError("No e-Stat credentials found for this user"),
      );
    }

    res.json({
      isAuthenticated: credential.isActive,
      lastSyncedAt: credential.lastSyncedAt,
      syncStatus: credential.syncStatus,
      lastError: credential.lastError,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/estat/sync
 * Fetch housing data from e-Stat and save as properties
 */
export const syncEstatData = async (req, res, next) => {
  try {
    const { prefecture, limit = 50, offset = 0 } = req.body;

    // Get user's e-Stat credentials
    const credential = await EstatCredential.findOne({
      userId: req.user._id,
    });

    if (!credential || !credential.isActive) {
      return next(
        new UnauthorizedError(
          "e-Stat credentials not found or inactive. Please authenticate first.",
        ),
      );
    }

    // Update sync status to "syncing"
    credential.syncStatus = "syncing";
    await credential.save();

    try {
      // Fetch data from e-Stat
      const client = new EstatClient(credential.appId, credential.apiKey);
      const estatData = await client.fetchHousingData({
        prefecture,
        limit,
        offset,
      });

      if (!estatData || estatData.length === 0) {
        credential.syncStatus = "completed";
        credential.lastSyncedAt = new Date();
        credential.lastError = null;
        await credential.save();

        return res.json({
          message: "No housing data found for the specified criteria",
          propertiesAdded: 0,
          propertiesUpdated: 0,
        });
      }

      // Save properties to database
      let added = 0;
      let updated = 0;

      for (const propertyData of estatData) {
        const existing = await Property.findOne({
          listingId: propertyData.listingId,
        });

        if (existing) {
          // Update existing property
          Object.assign(existing, propertyData);
          await existing.save();
          updated++;
        } else {
          // Create new property
          await Property.create({
            ...propertyData,
            owner: req.user._id,
          });
          added++;
        }
      }

      // Update sync status
      credential.syncStatus = "completed";
      credential.lastSyncedAt = new Date();
      credential.lastError = null;
      await credential.save();

      res.json({
        message: "e-Stat data synced successfully",
        propertiesAdded: added,
        propertiesUpdated: updated,
        totalProcessed: estatData.length,
      });
    } catch (syncError) {
      // Update sync status on failure
      credential.syncStatus = "failed";
      credential.lastError = syncError.message;
      await credential.save();

      return next(syncError);
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/estat/datasets
 * List available housing datasets from e-Stat
 */
export const getAvailableDatasets = async (req, res, next) => {
  try {
    const credential = await EstatCredential.findOne({
      userId: req.user._id,
    });

    if (!credential || !credential.isActive) {
      return next(
        new UnauthorizedError(
          "e-Stat credentials not found or inactive. Please authenticate first.",
        ),
      );
    }

    const client = new EstatClient(credential.appId, credential.apiKey);
    const datasets = await client.fetchDatasets("housing");

    res.json({
      datasets: datasets,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/estat/credentials
 * Remove e-Stat credentials for the user
 */
export const removeEstatCredentials = async (req, res, next) => {
  try {
    const credential = await EstatCredential.findOneAndDelete({
      userId: req.user._id,
    });

    if (!credential) {
      return next(
        new NotFoundError("No e-Stat credentials found for this user"),
      );
    }

    res.json({
      message: "e-Stat credentials removed successfully",
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/estat/properties
 * Get all synced properties from e-Stat
 */
export const getEstatProperties = async (req, res, next) => {
  try {
    const { prefecture, sortBy = "createdAt", order = "desc" } = req.query;

    let query = {
      owner: req.user._id,
      listingId: /^estat-/, // Only e-Stat properties
    };

    if (prefecture) {
      query.prefecture = prefecture;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const properties = await Property.find(query)
      .sort({ [sortBy]: sortOrder })
      .lean();

    res.json({
      count: properties.length,
      properties,
    });
  } catch (err) {
    return next(err);
  }
};
