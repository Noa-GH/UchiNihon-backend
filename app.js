require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { PORT, MONGO_URI, CORS_ORIGIN } = require("./utils/config");
const userRoutes = require("./routes/users");
const propertyRoutes = require("./routes/properties");
const { handleError } = require("./utils/errors");

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

// Global error handler — must be registered AFTER all routes.
// Express identifies it as an error handler because it has exactly 4 parameters.
app.use(handleError);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Accepting requests from: ${CORS_ORIGIN}`);
});
