const bcryt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config");
const {
  BadRequestError,
  UnauthenticatedError,
  ConflictError,
  NotFoundError,
} = require("../errors");

// POST - /api/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcryt.hash(password, 10);

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

module.exports = { signup, signin, getCurrentUser };
