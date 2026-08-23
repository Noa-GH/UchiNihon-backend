import Property from "../models/property.model.js";

/**
 * GET /api/listings
 *
 * Public endpoint — no JWT required.
 * Returns all Akiya property listings stored in the database.
 *
 * Optional query params:
 *   ?prefecture=Kyoto      — filter to a single prefecture
 *   ?maxPrice=5000000      — upper price limit in yen (0 = free transfer, still included)
 *   ?sortBy=price          — field to sort on (default: createdAt)
 *   ?order=asc             — asc or desc (default: desc)
 *
 * When the database is empty (no e-Stat sync has run yet), this returns
 * { count: 0, properties: [] } — the frontend handles that gracefully.
 */
export const getListings = async (req, res, next) => {
  try {
    const {
      prefecture,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // owner: null is what distinguishes a public/system listing (see
    // models/property.model.js) from a user's private saved property.
    // Without this filter, GET /api/listings — a public, unauthenticated
    // endpoint — returned EVERY user's saved homes to anyone.
    const query = { owner: null };

    // Prefecture filter — skip if "All" or not provided
    if (prefecture && prefecture !== "All") {
      query.prefecture = prefecture;
    }

    // Price ceiling — include free-transfer homes (price: 0) regardless
    if (maxPrice !== undefined && maxPrice !== "") {
      const ceiling = Number(maxPrice);
      if (!isNaN(ceiling)) {
        query.$or = [{ price: { $lte: ceiling } }, { price: 0 }];
      }
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = ["createdAt", "price", "yearBuilt", "sqMeters"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const properties = await Property.find(query)
      .sort({ [safeSortBy]: sortOrder })
      .lean();

    res.json({
      count: properties.length,
      properties,
    });
  } catch (err) {
    return next(err);
  }
};
