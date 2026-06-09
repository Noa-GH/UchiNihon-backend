import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true },
    title: { type: String, required: true },
    prefecture: { type: String, required: true },
    city: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    bedrooms: Number,
    sqMeters: Number,
    yearBuilt: Number,
    description: String,
    tags: [String],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }, // Automatically adds createdAt and updatedAt fields
);

// Compound unique index: one user can save a given listing only once.
// MongoDB throws error code 11000 on violation, which the controller
// catches and converts to a 409 Conflict response.
propertySchema.index({ listingId: 1, owner: 1 }, { unique: true });

export default mongoose.model("Property", propertySchema);
