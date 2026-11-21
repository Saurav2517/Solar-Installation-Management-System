import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

export const quotationItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  gstRate: z.number().min(0).max(100).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid('Customer ID required'),
  leadId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  customItems: z.array(quotationItemInputSchema).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

export const updateQuotationSchema = z.object({
  discountPercent: z.number().min(0).max(100).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  customItems: z.array(quotationItemInputSchema).optional(),
});

export const approveQuotationSchema = z.object({
  approvalStatus: z.enum([QuotationStatus.APPROVED, QuotationStatus.REJECTED]),
  approvalRemarks: z.string().optional(),
});

export const quotationQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type ApproveQuotationInput = z.infer<typeof approveQuotationSchema>;
export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;
