import { Request, Response, NextFunction } from 'express';

// Custom API Error class
export class ApiError extends Error {
  public statusCode: number;
  public errors: any[];
  public isOperational: boolean;

  constructor(statusCode: number, message: string, errors: any[] = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors: any[] = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], false);
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined,
    });
    return;
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    switch (prismaErr.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          message: `Duplicate value for field: ${prismaErr.meta?.target?.join(', ')}`,
        });
        return;
      case 'P2025':
        res.status(404).json({
          success: false,
          message: 'Record not found',
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          message: 'Foreign key constraint failed',
        });
        return;
      default:
        break;
    }
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
    return;
  }

  // JSON parse error
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
    return;
  }

  // Default - unexpected error
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

// Catch async errors wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
