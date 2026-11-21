import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Send a standardized success response
 */
export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: PaginationMeta
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  res.status(statusCode).json(response);
};

/**
 * Send a standardized error response
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: any[]
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
  };
  if (errors && errors.length > 0) {
    response.errors = errors;
  }
  res.status(statusCode).json(response);
};

/**
 * Parse pagination parameters from query string
 */
export const parsePagination = (query: any): PaginationParams => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 10));
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
  const search = query.search as string | undefined;

  return { page, limit, sortBy, sortOrder, search };
};

/**
 * Build pagination meta from total count and current params
 */
export const buildPaginationMeta = (
  total: number,
  params: PaginationParams
): PaginationMeta => {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1,
  };
};

/**
 * Calculate Prisma skip value from pagination params
 */
export const getPrismaSkip = (params: PaginationParams): number => {
  return (params.page - 1) * params.limit;
};
