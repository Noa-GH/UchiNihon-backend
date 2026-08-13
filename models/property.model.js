import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true },
    title: { type: String, required: true },
    prefecture: { type: String, required: true },
    city: { type: String, default: "" },
    price: { type: Number, required: true, default: 0 },
    imageUrl: { type: String, default: "" },
    bedrooms: Number,
    sqMeters: Number,
    yearBuilt: Number,
    description: String,
    tags: [String],
    // null owner = a public/system listing (e.g. synced from e-Stat), visible
    // to everyone via GET /api/listings. A set owner = that user's personal
    // saved property (POST /api/properties/saved).
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Set true for cards derived from aggregate e-Stat statistics (an area's
    // average price/vacancy rate) rather than a specific real property, so
    // the frontend can label them accordingly.
    isStatisticalEstimate: { type: Boolean, default: false },
    sourceDatasetId: String,
    statValue: Number,
    statUnit: String,
    statLabel: String,
  },
  { timestamps: true }, // Automatically adds createdAt and updatedAt fields
);

// Compound unique index: one user can save a given listing only once, and
// (owner: null) system/e-Stat listings are unique by listingId alone — so
// re-running a sync updates existing area cards instead of duplicating them.
// MongoDB throws error code 11000 on violation, which the controller
// catches and converts to a 409 Conflict response.
propertySchema.index({ listingId: 1, owner: 1 }, { unique: true });

export default mongoose.model("Property", propertySchema);
