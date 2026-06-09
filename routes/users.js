import express from "express";
import { signup, signin, getCurrentUser } from "../controllers/users.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/users/me", auth, getCurrentUser); // This will run first for auth

export default router;
