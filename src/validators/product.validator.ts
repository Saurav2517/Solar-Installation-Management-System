import { z } from 'zod';
import { WarrantyEventType } from '@prisma/client';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  unitPrice: z.number().positive('Unit price must be positive'),
  unit: z.string().default('piece'),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(0),
  warrantyMonths: z.number().int().nonnegative().optional(),
  warrantyEvent: z.nativeEnum(WarrantyEventType).optional().default(WarrantyEventType.INSTALLATION_COMPLETE),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
