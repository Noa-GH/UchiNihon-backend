import mongoose from "mongoose";

// Singleton document tracking the server-wide e-Stat sync (there is exactly
// one row, key: "default"). e-Stat credentials live in ESTAT_APP_ID (env),
// not per-user — this just remembers when/how the last sync went.
const estatSyncStateSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    lastSyncedAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ["idle", "syncing", "completed", "failed"],
      default: "idle",
    },
    lastError: { type: String, default: null },
    lastStatsDataId: { type: String, default: null },
    lastCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("EstatSyncState", estatSyncStateSchema);
