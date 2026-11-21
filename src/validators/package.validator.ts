import { z } from 'zod';
import { SystemType } from '@prisma/client';

export const packageComponentItemSchema = z.object({
  productId: z.string().uuid('Valid product ID required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  isOptional: z.boolean().optional().default(false),
});

export const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional(),
  systemType: z.nativeEnum(SystemType),
  capacityKw: z.number().positive('Capacity in kW must be positive'),
  basePrice: z.number().positive('Base price must be positive'),
  isActive: z.boolean().optional().default(true),
  components: z.array(packageComponentItemSchema).optional(),
});

export const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  components: z.array(packageComponentItemSchema).optional(),
});

export const calculateBOMSchema = z.object({
  packageId: z.string().uuid(),
  customCapacityKw: z.number().positive().optional(),
});

export const packageQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('capacityKw'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
  systemType: z.nativeEnum(SystemType).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type CalculateBOMInput = z.infer<typeof calculateBOMSchema>;
export type PackageQueryInput = z.infer<typeof packageQuerySchema>;
