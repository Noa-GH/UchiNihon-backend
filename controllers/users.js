import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { JWT_SECRET } from "../utils/config.js";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";

const signToken = (userId) =>
  jwt.sign({ _id: userId }, JWT_SECRET, { expiresIn: "7d" });

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
});

// POST - /api/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Previously bcrypt.hash(undefined, 10) ran before any check, throwing
    // inside the try block and surfacing as an opaque 500 instead of a
    // clear 400. Validating first also avoids hashing work for a request
    // that was never going to succeed.
    if (!name || !email || !password) {
      return next(
        new BadRequestError("name, email, and password are all required"),
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // Sign in immediately on signup. The frontend previously had to chain
    // signup -> signin -> getCurrentUser (three sequential round-trips,
    // each re-paying a Render cold start) just to end up logged in.
    // Returning a token here collapses that to one request.
    const token = signToken(user._id);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    if (err.code === 11000)
      return next(new ConflictError("Email already exists"));
    if (err.name === "ValidationError")
      return next(new BadRequestError(err.message));
    return next(err);
  }
};

// POST /api/signin
const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new BadRequestError("email and password are required"));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) return next(new UnauthorizedError("Invalid email or password"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return next(new UnauthorizedError("Invalid email or password"));

    // Return the user alongside the token so the frontend doesn't need a
    // separate GET /api/users/me round-trip right after signing in.
    const token = signToken(user._id);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    return next(err);
  }
};

// GET - /api/users/me (protected user by the auth middleware)
// Still needed on its own: it's how AuthContext re-validates a token that
// was loaded from localStorage on app start, when there is no fresh
// signup/signin response to read the user from.
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new NotFoundError("User not found"));
    res.json(toPublicUser(user));
  } catch (err) {
    return next(err);
  }
};

export { signup, signin, getCurrentUser };
