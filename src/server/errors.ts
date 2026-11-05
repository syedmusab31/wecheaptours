/**
 * Errors a service throws on purpose. Route adapters turn them into HTTP responses
 * (see `toErrorResponse`) and admin actions into form messages.
 * Anything else is a bug and goes to the error tracker.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, "validation");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "not_found");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "conflict");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not signed in") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, 403, "forbidden");
  }
}

export class RateLimitError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many attempts. Please wait a moment and try again.", 429, "rate_limited");
  }
}
