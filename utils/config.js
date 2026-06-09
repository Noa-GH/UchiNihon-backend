import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3001;
export const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/UchiNihon";
export const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-here || optional-fallback-here";

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3002";
export const CORS_ORIGIN = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
