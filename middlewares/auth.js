import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/config.js";
import { UnauthorizedError } from "../utils/errors.js";

// This middleware runs before any protected route handler.
// It reads the Authorization header, verifies the JWT, and attaches
// the decoded payload (which contains _id) to req.user.
// Controllers then use req.user._id to identify who is making the request.

const auth = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(
      new UnauthorizedError("Authorization header missing or malformed"),
    );
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
};

export default auth;
