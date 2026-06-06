require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/UchiNihon",
  JWT_SECRET:
    process.env.JWT_SECRET || "your-secret-here || optional-fallback-here",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
};
