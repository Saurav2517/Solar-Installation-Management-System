import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './errorHandler';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates request data against a Zod schema.
 * @param schema - The Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'query', 'params')
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      // Replace the target with parsed (and potentially transformed) data
      (req as any)[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.map(String).join('.'),
          message: e.message,
        }));
        next(ApiError.badRequest('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};
