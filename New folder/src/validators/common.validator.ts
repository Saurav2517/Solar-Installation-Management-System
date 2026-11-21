import { z } from 'zod';

// Common validators
export const uuidParam = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationQuery = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});
