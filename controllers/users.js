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

// POST - /api/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email });
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

    const user = await User.findOne({ email }).select("+password");

    if (!user) return next(new UnauthorizedError("Invalid email or password"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return next(new UnauthorizedError("Invalid email or password"));

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    return next(err);
  }
};

// GET - /api/users/me (protected user by the auth middleware)
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new NotFoundError("User not found"));
    res.json(user);
  } catch (err) {
    return next(err);
  }
};

export { signup, signin, getCurrentUser };
