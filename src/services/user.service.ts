import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { config } from '../config';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateUserByAdminInput,
  AdminUpdateUserInput,
  UpdateProfileInput,
  UserQueryInput,
} from '../validators/user.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { Prisma, UserRole } from '@prisma/client';

export class UserService {
  /**
   * List users with pagination, sorting, search, and filtering (Admin only)
   */
  async getUsers(query: UserQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (pagination.search) {
      where.OR = [
        { firstName: { contains: pagination.search, mode: 'insensitive' } },
        { lastName: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
        { phone: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              city: true,
              state: true,
            },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { users, meta };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        customer: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  /**
   * Create user by Admin
   */
  async createUser(input: CreateUserByAdminInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw ApiError.conflict('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, config.bcrypt.saltRounds);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role,
          isActive: input.isActive ?? true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (user.role === UserRole.CUSTOMER) {
        await tx.customer.create({
          data: {
            userId: user.id,
          },
        });
      }

      return user;
    });
  }

  /**
   * Update user details (Admin)
   */
  async updateUser(id: string, input: AdminUpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        isActive: input.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Deactivate or Delete user (Admin)
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Soft delete by deactivating and revoking tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      }),
    ]);

    return { message: 'User deactivated successfully' };
  }

  /**
   * Update self profile
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        avatar: input.avatar,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        updatedAt: true,
      },
    });
  }
}

export const userService = new UserService();
