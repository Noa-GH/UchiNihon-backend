// Custom error classes for better error handling in Express
// This centralizes error handling and allows us to throw specific errors with appropriate status codes and messages.

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

class ServiceUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 503;
  }
}

// Global error handling middleware
// This is how Express recognizes an error-handling middleware: it has four parameters (err, req, res, next)
const handleError = (err, req, res, next) => {
  const { statusCode = 500, message = "Internal Server Error" } = err;
  // Previously this handler never logged anything, so a 500 in production
  // was undiagnosable from Render's logs — you'd see the client-side
  // failure with no idea what actually threw on the server.
  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  res
    .status(statusCode)
    .json({ error: statusCode === 500 ? "Internal Server Error" : message });
};

export {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  handleError,
};
