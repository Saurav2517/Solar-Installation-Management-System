import { UserRole } from '@prisma/client';
import { Request } from 'express';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generic service response
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}
