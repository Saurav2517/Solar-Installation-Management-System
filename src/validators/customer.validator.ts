import { z } from 'zod';

export const createCustomerSchema = z.object({
  userId: z.string().uuid().optional(),
  // Or new user creation if not existing:
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),

  // Customer specific details:
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  electricityBoard: z.string().optional(),
  consumerNumber: z.string().optional(),
  sanctionedLoad: z.number().positive().optional(),
  monthlyBill: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  electricityBoard: z.string().optional(),
  consumerNumber: z.string().optional(),
  sanctionedLoad: z.number().positive().optional(),
  monthlyBill: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const customerQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
