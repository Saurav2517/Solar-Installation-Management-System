import { z } from 'zod';
import { LeadStatus, SystemType } from '@prisma/client';

export const createLeadSchema = z.object({
  customerId: z.string().uuid('Customer ID must be a valid UUID'),
  salesExecutiveId: z.string().uuid().optional(),
  source: z.string().optional(),
  systemTypeInterest: z.nativeEnum(SystemType).optional(),
  capacityInterest: z.number().positive().optional(),
  requirements: z.string().optional(),
  remarks: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  salesExecutiveId: z.string().uuid().optional(),
  systemTypeInterest: z.nativeEnum(SystemType).optional(),
  capacityInterest: z.number().positive().optional(),
  requirements: z.string().optional(),
  remarks: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  lostReason: z.string().optional(),
});

export const assignSalesExecutiveSchema = z.object({
  salesExecutiveId: z.string().uuid('Sales Executive ID must be a valid UUID'),
});

export const leadQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  salesExecutiveId: z.string().uuid().optional(),
  systemTypeInterest: z.nativeEnum(SystemType).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type AssignSalesExecutiveInput = z.infer<typeof assignSalesExecutiveSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
