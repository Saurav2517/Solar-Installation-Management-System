import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateSurveyInput,
  UpdateSurveyInput,
  ApproveSurveyInput,
  AddSurveyPhotoInput,
  SurveyQueryInput,
} from '../validators/survey.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { LeadStatus, Prisma, SurveyApprovalStatus } from '@prisma/client';

export class SiteSurveyService {
  /**
   * Schedule / Record a site survey
   */
  async createSurvey(input: CreateSurveyInput, createdById: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (input.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
      });
      if (!lead) {
        throw ApiError.notFound('Lead not found');
      }

      // Update lead status to SITE_SURVEY_SCHEDULED or COMPLETED
      await prisma.lead.update({
        where: { id: input.leadId },
        data: {
          status: input.roofArea
            ? LeadStatus.SITE_SURVEY_COMPLETED
            : LeadStatus.SITE_SURVEY_SCHEDULED,
        },
      });
    }

    return prisma.siteSurvey.create({
      data: {
        customerId: input.customerId,
        leadId: input.leadId,
        createdById,
        roofArea: input.roofArea,
        roofDirection: input.roofDirection,
        roofTilt: input.roofTilt,
        roofType: input.roofType,
        shadowFreeArea: input.shadowFreeArea,
        cableDistance: input.cableDistance,
        electricityBoard: input.electricityBoard,
        meterType: input.meterType,
        sanctionedLoad: input.sanctionedLoad,
        existingPhase: input.existingPhase,
        structureType: input.structureType,
        accessToRoof: input.accessToRoof,
        observations: input.observations,
        surveyDate: input.surveyDate ? new Date(input.surveyDate) : new Date(),
        approvalStatus: SurveyApprovalStatus.PENDING,
      },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        photos: true,
      },
    });
  }

  /**
   * List surveys with filtering, sorting, and pagination
   */
  async getSurveys(query: SurveyQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.SiteSurveyWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.leadId) {
      where.leadId = query.leadId;
    }

    if (query.approvalStatus) {
      where.approvalStatus = query.approvalStatus;
    }

    if (pagination.search) {
      where.OR = [
        { observations: { contains: pagination.search, mode: 'insensitive' } },
        { electricityBoard: { contains: pagination.search, mode: 'insensitive' } },
        {
          customer: {
            user: {
              OR: [
                { firstName: { contains: pagination.search, mode: 'insensitive' } },
                { lastName: { contains: pagination.search, mode: 'insensitive' } },
                { email: { contains: pagination.search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, surveys] = await Promise.all([
      prisma.siteSurvey.count({ where }),
      prisma.siteSurvey.findMany({
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
                select: { id: true, firstName: true, lastName: true, email: true, phone: true },
              },
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          photos: true,
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { surveys, meta };
  }

  /**
   * Get single survey by ID
   */
  async getSurveyById(id: string) {
    const survey = await prisma.siteSurvey.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        lead: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        photos: true,
      },
    });

    if (!survey) {
      throw ApiError.notFound('Site survey not found');
    }

    return survey;
  }

  /**
   * Update survey parameters
   */
  async updateSurvey(id: string, input: UpdateSurveyInput) {
    const survey = await prisma.siteSurvey.findUnique({ where: { id } });
    if (!survey) {
      throw ApiError.notFound('Site survey not found');
    }

    if (survey.approvalStatus === SurveyApprovalStatus.APPROVED) {
      throw ApiError.badRequest('Approved surveys cannot be modified directly');
    }

    return prisma.siteSurvey.update({
      where: { id },
      data: {
        ...input,
        surveyDate: input.surveyDate ? new Date(input.surveyDate) : undefined,
      },
      include: {
        photos: true,
      },
    });
  }

  /**
   * Approve or reject a site survey (Only approved surveys proceed to quotation)
   */
  async approveSurvey(id: string, input: ApproveSurveyInput, approverId: string) {
    const survey = await prisma.siteSurvey.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!survey) {
      throw ApiError.notFound('Site survey not found');
    }

    const updatedSurvey = await prisma.siteSurvey.update({
      where: { id },
      data: {
        approvalStatus: input.approvalStatus,
        approvalRemarks: input.approvalRemarks,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        customer: true,
      },
    });

    // If survey was linked to lead, update lead status
    if (survey.leadId) {
      if (input.approvalStatus === SurveyApprovalStatus.APPROVED) {
        await prisma.lead.update({
          where: { id: survey.leadId },
          data: { status: LeadStatus.SITE_SURVEY_COMPLETED },
        });
      }
    }

    return updatedSurvey;
  }

  /**
   * Add photo to survey
   */
  async addPhoto(surveyId: string, input: AddSurveyPhotoInput) {
    const survey = await prisma.siteSurvey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      throw ApiError.notFound('Site survey not found');
    }

    return prisma.surveyPhoto.create({
      data: {
        surveyId,
        url: input.url,
        caption: input.caption,
      },
    });
  }

  /**
   * Delete survey photo
   */
  async deletePhoto(photoId: string) {
    const photo = await prisma.surveyPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      throw ApiError.notFound('Photo not found');
    }

    await prisma.surveyPhoto.delete({ where: { id: photoId } });
    return { message: 'Photo deleted successfully' };
  }
}

export const siteSurveyService = new SiteSurveyService();
