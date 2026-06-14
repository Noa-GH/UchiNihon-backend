import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { PORT, MONGO_URI, CORS_ORIGIN } from "./utils/config.js";
import userRoutes from "./routes/users.js";
import propertyRoutes from "./routes/properties.js";
import estatRoutes from "./routes/estat.js";
import { handleError } from "./utils/errors.js";

dotenv.config();

const app = express();

// CORS_ORIGIN is read from .env so no code change is needed between
// dev (localhost:3002) and production (https://custom-domain.com).
app.use(
  cors({
    origin: CORS_ORIGIN, //If multiple addresses are needed, split by ',' for each address domain
    credentials: true,
  }),
);

app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
