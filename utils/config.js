import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3001;
export const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/UchiNihon";
export const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-here || optional-fallback-here";

// A browser's Origin header is scheme + host + optional port — never a path,
// never a trailing slash. So "https://noa-gh.github.io/UchiNihon-frontend/"
// (the URL you'd naturally copy from the address bar) must be reduced to
// "https://noa-gh.github.io" before it can ever match an incoming request.
// Normalising both sides makes the allowlist tolerant of how it was written.
export const normalizeOrigin = (value) => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  try {
    // URL.origin yields exactly what the browser sends.
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    // Not a parseable URL — drop any path segment and normalise what's left.
    return trimmed.replace(/\/.*$/, "").toLowerCase();
  }
};

// Default is the Vite dev server (see vite.config.ts -> server.port), NOT the
// backend's own port. The previous default of 3001 was the API itself, which
// meant a missing CORS_ORIGIN blocked every browser request in dev and prod.
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
export const CORS_ORIGIN = corsOrigin
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

// e-Stat (Japan government statistics API). appId is a single server-side
// credential — e-Stat issues one per registered application, not per end-user.
export const ESTAT_APP_ID = process.env.ESTAT_APP_ID || "";
export const ESTAT_STATS_DATA_ID = process.env.ESTAT_STATS_DATA_ID || "";
export const ESTAT_BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json";
export const ESTAT_REQUEST_TIMEOUT = Number(
  process.env.ESTAT_REQUEST_TIMEOUT || 30000,
);
