import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateLeadInput,
  UpdateLeadInput,
  LeadQueryInput,
} from '../validators/lead.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { LeadStatus, Prisma, UserRole } from '@prisma/client';

export class LeadService {
  /**
   * Create a new lead/enquiry
   */
  async createLead(input: CreateLeadInput) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (input.salesExecutiveId) {
      const sales = await prisma.user.findFirst({
        where: {
          id: input.salesExecutiveId,
          role: { in: [UserRole.SALES_EXECUTIVE, UserRole.ADMIN] },
          isActive: true,
        },
      });

      if (!sales) {
        throw ApiError.badRequest('Assigned user is not an active sales executive');
      }
    }

    return prisma.lead.create({
      data: {
        customerId: input.customerId,
        salesExecutiveId: input.salesExecutiveId,
        source: input.source || 'WEB_FORM',
        systemTypeInterest: input.systemTypeInterest,
        capacityInterest: input.capacityInterest,
        requirements: input.requirements,
        remarks: input.remarks,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
        status: LeadStatus.NEW,
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        salesExecutive: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get leads with filtering, sorting, and pagination
   */
  async getLeads(query: LeadQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.LeadWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.salesExecutiveId) {
      where.salesExecutiveId = query.salesExecutiveId;
    }

    if (query.systemTypeInterest) {
      where.systemTypeInterest = query.systemTypeInterest;
    }

    if (pagination.search) {
      where.OR = [
        { requirements: { contains: pagination.search, mode: 'insensitive' } },
        { remarks: { contains: pagination.search, mode: 'insensitive' } },
        { source: { contains: pagination.search, mode: 'insensitive' } },
        {
          customer: {
            user: {
              OR: [
                { firstName: { contains: pagination.search, mode: 'insensitive' } },
                { lastName: { contains: pagination.search, mode: 'insensitive' } },
                { email: { contains: pagination.search, mode: 'insensitive' } },
                { phone: { contains: pagination.search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          salesExecutive: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              siteSurveys: true,
              quotations: true,
            },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { leads, meta };
  }

  /**
   * Get single lead by ID
   */
  async getLeadById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        salesExecutive: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        siteSurveys: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            photos: true,
          },
        },
        quotations: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    return lead;
  }

  /**
   * Update lead details and status
   */
  async updateLead(id: string, input: UpdateLeadInput) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    const updateData: Prisma.LeadUpdateInput = {
      status: input.status,
      systemTypeInterest: input.systemTypeInterest,
      capacityInterest: input.capacityInterest,
      requirements: input.requirements,
      remarks: input.remarks,
      lostReason: input.lostReason,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
    };

    if (input.status === LeadStatus.CONVERTED && !lead.convertedAt) {
      updateData.convertedAt = new Date();
    }

    if (input.salesExecutiveId) {
      updateData.salesExecutive = {
        connect: { id: input.salesExecutiveId },
      };
    }

    return prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        salesExecutive: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Assign or reassign sales executive to lead
   */
  async assignSalesExecutive(leadId: string, salesExecutiveId: string) {
    const [lead, sales] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.user.findFirst({
        where: {
          id: salesExecutiveId,
          role: { in: [UserRole.SALES_EXECUTIVE, UserRole.ADMIN] },
          isActive: true,
        },
      }),
    ]);

    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    if (!sales) {
      throw ApiError.badRequest('Assigned user is not an active sales executive');
    }

    return prisma.lead.update({
      where: { id: leadId },
      data: {
        salesExecutiveId,
        status: lead.status === LeadStatus.NEW ? LeadStatus.CONTACTED : lead.status,
      },
      include: {
        salesExecutive: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Get conversion analytics and pipeline statistics
   */
  async getLeadAnalytics() {
    const [totalLeads, convertedLeads, leadsByStatus] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: LeadStatus.CONVERTED } }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      convertedLeads,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      leadsByStatus: leadsByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const leadService = new LeadService();
