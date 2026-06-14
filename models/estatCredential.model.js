import mongoose from "mongoose";

const estatCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    appId: {
      type: String,
      required: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ["idle", "syncing", "completed", "failed"],
      default: "idle",
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("EstatCredential", estatCredentialSchema);
