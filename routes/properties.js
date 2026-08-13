import express from "express";
import {
  getSavedProperties,
  saveProperty,
  unsaveProperty,
} from "../controllers/properties.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// Any route requires a valid token automatically
router.use(auth);

router.get("/properties/saved", getSavedProperties);
router.post("/properties/saved", saveProperty);
router.delete("/properties/saved/:id", unsaveProperty);

export default router;
