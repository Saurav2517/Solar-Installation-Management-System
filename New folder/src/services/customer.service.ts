import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { config } from '../config';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from '../validators/customer.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { Prisma, UserRole } from '@prisma/client';

export class CustomerService {
  /**
   * Create or register customer
   */
  async createCustomer(input: CreateCustomerInput) {
    let targetUserId = input.userId;

    // If userId not provided, create a user account for customer
    if (!targetUserId) {
      if (!input.email || !input.password || !input.firstName || !input.lastName) {
        throw ApiError.badRequest(
          'Email, password, firstName, and lastName are required when creating a new customer account'
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existingUser) {
        throw ApiError.conflict('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(input.password, config.bcrypt.saltRounds);

      const newUser = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: UserRole.CUSTOMER,
        },
      });

      targetUserId = newUser.id;
    } else {
      // Check if user already has customer profile
      const existingCustomer = await prisma.customer.findUnique({
        where: { userId: targetUserId },
      });
      if (existingCustomer) {
        throw ApiError.conflict('Customer profile already exists for this user');
      }
    }

    return prisma.customer.create({
      data: {
        userId: targetUserId,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        gstNumber: input.gstNumber,
        aadharNumber: input.aadharNumber,
        electricityBoard: input.electricityBoard,
        consumerNumber: input.consumerNumber,
        sanctionedLoad: input.sanctionedLoad,
        monthlyBill: input.monthlyBill,
        notes: input.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Search and filter customers with pagination
   */
  async getCustomers(query: CustomerQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.CustomerWhereInput = {};

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.state) {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    if (pagination.search) {
      where.OR = [
        { address: { contains: pagination.search, mode: 'insensitive' } },
        { consumerNumber: { contains: pagination.search, mode: 'insensitive' } },
        { electricityBoard: { contains: pagination.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: pagination.search, mode: 'insensitive' } },
              { lastName: { contains: pagination.search, mode: 'insensitive' } },
              { email: { contains: pagination.search, mode: 'insensitive' } },
              { phone: { contains: pagination.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              installations: true,
              serviceTickets: true,
              orders: true,
              quotations: true,
            },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { customers, meta };
  }

  /**
   * Retrieve full customer profile
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        siteSurveys: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        installations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        serviceTickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return customer;
  }

  /**
   * Update customer profile
   */
  async updateCustomer(id: string, input: UpdateCustomerInput) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return prisma.customer.update({
      where: { id },
      data: input,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * View customer installation history
   */
  async getCustomerInstallations(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return prisma.installation.findMany({
      where: { customerId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
        technicianAssignments: {
          include: {
            technician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        photos: true,
        equipment: {
          include: {
            serialNumber: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * View customer service history
   */
  async getCustomerServiceHistory(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return prisma.serviceTicket.findMany({
      where: { customerId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        technicianAssignments: {
          include: {
            technician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const customerService = new CustomerService();
