import { z } from 'zod';
import { SurveyApprovalStatus } from '@prisma/client';

export const createSurveySchema = z.object({
  customerId: z.string().uuid('Customer ID must be a valid UUID'),
  leadId: z.string().uuid().optional(),
  roofArea: z.number().positive().optional(),
  roofDirection: z.string().optional(),
  roofTilt: z.number().optional(),
  roofType: z.string().optional(),
  shadowFreeArea: z.number().positive().optional(),
  cableDistance: z.number().positive().optional(),
  electricityBoard: z.string().optional(),
  meterType: z.string().optional(),
  sanctionedLoad: z.number().positive().optional(),
  existingPhase: z.string().optional(),
  structureType: z.string().optional(),
  accessToRoof: z.string().optional(),
  observations: z.string().optional(),
  surveyDate: z.string().datetime().optional(),
});

export const updateSurveySchema = z.object({
  roofArea: z.number().positive().optional(),
  roofDirection: z.string().optional(),
  roofTilt: z.number().optional(),
  roofType: z.string().optional(),
  shadowFreeArea: z.number().positive().optional(),
  cableDistance: z.number().positive().optional(),
  electricityBoard: z.string().optional(),
  meterType: z.string().optional(),
  sanctionedLoad: z.number().positive().optional(),
  existingPhase: z.string().optional(),
  structureType: z.string().optional(),
  accessToRoof: z.string().optional(),
  observations: z.string().optional(),
  surveyDate: z.string().datetime().optional(),
});

export const approveSurveySchema = z.object({
  approvalStatus: z.enum([SurveyApprovalStatus.APPROVED, SurveyApprovalStatus.REJECTED]),
  approvalRemarks: z.string().optional(),
});

export const addSurveyPhotoSchema = z.object({
  url: z.string().url('Photo URL must be a valid URL'),
  caption: z.string().optional(),
});

export const surveyQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  approvalStatus: z.nativeEnum(SurveyApprovalStatus).optional(),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type ApproveSurveyInput = z.infer<typeof approveSurveySchema>;
export type AddSurveyPhotoInput = z.infer<typeof addSurveyPhotoSchema>;
export type SurveyQueryInput = z.infer<typeof surveyQuerySchema>;
