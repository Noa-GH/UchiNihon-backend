import express from "express";
import { getListings } from "../controllers/listings.js";

const router = express.Router();

/**
 * @route GET /api/listings
 * @desc  Public — returns all Akiya property listings.
 *        No JWT required so unauthenticated visitors can browse.
 * @query { prefecture?: string, maxPrice?: number, sortBy?: string, order?: 'asc'|'desc' }
 * @returns { count: number, properties: AkiyaListing[] }
 */
router.get("/listings", getListings);

export default router;
