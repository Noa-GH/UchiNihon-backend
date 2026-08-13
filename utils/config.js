import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3001;
export const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/UchiNihon";
export const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-here || optional-fallback-here";

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3001";
export const CORS_ORIGIN = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// e-Stat (Japan government statistics API). appId is a single server-side
// credential — e-Stat issues one per registered application, not per end-user.
export const ESTAT_APP_ID = process.env.ESTAT_APP_ID || "";
export const ESTAT_STATS_DATA_ID = process.env.ESTAT_STATS_DATA_ID || "";
export const ESTAT_BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json";
export const ESTAT_REQUEST_TIMEOUT = Number(
  process.env.ESTAT_REQUEST_TIMEOUT || 30000,
);
