import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { PORT, MONGO_URI, CORS_ORIGIN } from "./utils/config.js";
import userRoutes from "./routes/users.js";
import propertyRoutes from "./routes/properties.js";
import estatRoutes from "./routes/estat.js";
import listingsRoutes from "./routes/listings.js";
import { handleError } from "./utils/errors.js";

dotenv.config();

const app = express();

const ALLOWED_ORIGINS = new Set(CORS_ORIGIN);

// Log rejected origins for diagnosability. This runs BEFORE the `cors`
// middleware and only observes — it never blocks — because the actual
// allow/deny decision below is left to `cors`'s own array-matching, which
// is the one behavior of this package that is verified correct (see note
// on the cors() call). A custom `origin` callback function was tried here
// first; it had to be reverted because cors@2.8.6 has a real bug in that
// code path: `if (err2 || !origin) next(err2)` treats ANY falsy callback
// value (false, '', null) as "skip this middleware entirely" rather than
// "deny" — so callback(null, false) let a rejected-origin request fall
// through with no CORS headers at all, straight into the route handler,
// instead of the clean 204-with-no-ACAO the array form gives for free.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin.toLowerCase())) {
    console.warn(`[cors] blocked request from origin: ${origin}`);
  }
  next();
});

// CORS_ORIGIN is read from .env so no code change is needed between
// dev (localhost:3000) and production (GitHub Pages / Netlify).
//
// Passing the array directly (rather than a custom origin function) uses
// cors's own isOriginAllowed() array-matching, which correctly reflects
// Access-Control-Allow-Origin when the request origin is in the list and
// omits the header entirely otherwise — for BOTH cases, this happens
// inside cors's OPTIONS short-circuit, so a preflight always resolves
// with a clean 204, never a 500 and never a fall-through to the route.
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // Cache each preflight for 24h. Without this, every POST/DELETE first
    // sends an OPTIONS request — a second round-trip that can itself hit a
    // sleeping Render dyno and time out, surfacing as a CORS error even
    // though the actual request would have succeeded.
    maxAge: 86400,
    // No `credentials: true` — auth is a Bearer token in an Authorization
    // header (see middlewares/auth.js), never a cookie. That flag only
    // matters for cookie-based auth, and it forbids using "*" for ACAO,
    // so leaving it off keeps the allowlist logic simpler for no cost.
  }),
);

app.use(express.json());

// Registered before the DB connects and before any other route, so it can
// answer instantly even while Mongo is still connecting or unreachable.
// This is the endpoint the frontend should ping to wake a sleeping Render
// dyno — unlike GET /api/listings, it never touches the database.
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api", listingsRoutes); // public — no auth required
app.use("/api", userRoutes);
app.use("/api", propertyRoutes);
app.use("/api", estatRoutes);

// Global error handler — must be registered AFTER all routes.
// Express identifies it as an error handler because it has exactly 4 parameters.
app.use(handleError);

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Accepting requests from: ${CORS_ORIGIN}`);
});
// This was added to help debug when code is no longer the issue for server crashes
// Whenever Ports are in conflict via local machine, this error is thrown to explain that.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Make sure no other instance is running and try again.`,
    );
  } else {
    console.error("Server failed to start:", err);
  }
  process.exit(1);
});
