import Decimal from 'decimal.js';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateQuotationInput,
  ApproveQuotationInput,
  QuotationQueryInput,
} from '../validators/quotation.validator';
import {
  buildPaginationMeta,
  generateReferenceNumber,
  getPrismaSkip,
  parsePagination,
} from '../utils';
import { Prisma, QuotationStatus, SurveyApprovalStatus } from '@prisma/client';
import { solarPackageService } from './package.service';

export class QuotationService {
  /**
   * Helper: Calculate government rooftop solar subsidy estimate
   * Based on PM Surya Ghar guidelines:
   * Up to 2 kW: ~₹30,000/kW, 3 kW: additional ₹18,000, max ₹78,000
   */
  private calculateEstimatedSubsidy(capacityKw: number): number {
    const kw = new Decimal(capacityKw);
    if (kw.lessThanOrEqualTo(0)) return 0;

    if (kw.lessThanOrEqualTo(2)) {
      return kw.times(30000).toNumber();
    } else if (kw.lessThanOrEqualTo(3)) {
      return new Decimal(60000).plus(kw.minus(2).times(18000)).toNumber();
    } else {
      return 78000;
    }
  }

  /**
   * Create Quotation
   * Enforces business rule: "Only after the survey is approved should the customer receive a quote."
   */
  async createQuotation(input: CreateQuotationInput, createdById: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      include: {
        siteSurveys: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    // Business rule check: survey approval required before quote
    const latestSurvey = customer.siteSurveys[0];
    if (!latestSurvey) {
      throw ApiError.badRequest(
        'Cannot generate quotation: A site survey must be completed and approved first'
      );
    }

    if (latestSurvey.approvalStatus !== SurveyApprovalStatus.APPROVED) {
      throw ApiError.badRequest(
        `Cannot generate quotation: Latest site survey status is ${latestSurvey.approvalStatus}. Only APPROVED surveys may receive a quotation.`
      );
    }

    // Build quotation items
    const itemsData: {
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: Decimal;
      gstRate: Decimal;
      totalPrice: Decimal;
    }[] = [];

    let estimatedCapacityKw = 3.0;

    // If package selected, auto-populate BOM components
    if (input.packageId) {
      const bom = await solarPackageService.calculateBOM(input.packageId);
      estimatedCapacityKw = Number(bom.package.baseCapacityKw);

      for (const item of bom.bomItems) {
        const unitP = new Decimal(item.unitPrice);
        const gstR = new Decimal(item.gstRate);
        const totalP = unitP.times(item.quantity).times(new Decimal(1).plus(gstR.dividedBy(100)));

        itemsData.push({
          productId: item.productId,
          description: `${item.productName} (${item.model || item.brand || ''})`,
          quantity: item.quantity,
          unitPrice: unitP,
          gstRate: gstR,
          totalPrice: totalP,
        });
      }
    }

    // Add any custom line items
    if (input.customItems && input.customItems.length > 0) {
      for (const item of input.customItems) {
        const unitP = new Decimal(item.unitPrice);
        const gstR = new Decimal(item.gstRate || 0);
        const totalP = unitP.times(item.quantity).times(new Decimal(1).plus(gstR.dividedBy(100)));

        itemsData.push({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: unitP,
          gstRate: gstR,
          totalPrice: totalP,
        });
      }
    }

    if (itemsData.length === 0) {
      throw ApiError.badRequest('Quotation must contain at least one package or custom line item');
    }

    // Calculate totals using reliable Decimal arithmetic
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    for (const item of itemsData) {
      const lineSub = item.unitPrice.times(item.quantity);
      const lineTax = lineSub.times(item.gstRate).dividedBy(100);
      subtotal = subtotal.plus(lineSub);
      totalTax = totalTax.plus(lineTax);
    }

    const discountPercent = new Decimal(input.discountPercent || 0);
    const discountAmount = subtotal.times(discountPercent).dividedBy(100);
    const taxableAmount = subtotal.minus(discountAmount);

    const cgst = totalTax.dividedBy(2).toDecimalPlaces(2);
    const sgst = totalTax.dividedBy(2).toDecimalPlaces(2);
    const totalAmount = taxableAmount.plus(totalTax).toDecimalPlaces(2);

    const estimatedSubsidy = new Decimal(this.calculateEstimatedSubsidy(estimatedCapacityKw));
    const quotationNumber = generateReferenceNumber('QUO');

    const validUntil = input.validUntil
      ? new Date(input.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: input.customerId,
        leadId: input.leadId,
        packageId: input.packageId,
        createdById,
        subtotal: subtotal.toDecimalPlaces(2),
        discountPercent: discountPercent.toDecimalPlaces(2),
        discountAmount: discountAmount.toDecimalPlaces(2),
        taxableAmount: taxableAmount.toDecimalPlaces(2),
        cgst,
        sgst,
        igst: new Decimal(0),
        totalAmount,
        estimatedSubsidy,
        status: QuotationStatus.DRAFT,
        validUntil,
        notes: input.notes,
        termsAndConditions:
          '1. Validity: 30 days from issue.\n2. Payment: Advance with order, balance upon delivery.\n3. Warranty: as per manufacturer terms.',
        items: {
          create: itemsData.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toDecimalPlaces(2),
            gstRate: item.gstRate.toDecimalPlaces(2),
            totalPrice: item.totalPrice.toDecimalPlaces(2),
          })),
        },
      },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        package: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * Get quotations with pagination
   */
  async getQuotations(query: QuotationQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.QuotationWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (pagination.search) {
      where.OR = [
        { quotationNumber: { contains: pagination.search, mode: 'insensitive' } },
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

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
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
          package: true,
          items: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { quotations, meta };
  }

  /**
   * Get single quotation by ID
   */
  async getQuotationById(id: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        package: {
          include: {
            components: {
              include: { product: true },
            },
          },
        },
        items: {
          include: { product: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    return quotation;
  }

  /**
   * Approve or reject quotation
   */
  async approveQuotation(id: string, input: ApproveQuotationInput, approverId: string) {
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    return prisma.quotation.update({
      where: { id },
      data: {
        status: input.approvalStatus,
        approvalRemarks: input.approvalRemarks,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        customer: true,
        items: true,
      },
    });
  }

  /**
   * Generate PDF quotation document
   */
  async generatePDF(id: string): Promise<Buffer> {
    const quotation = await this.getQuotationById(id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer: any) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: any) => reject(err));

      doc.fontSize(20).text('SUNPOWER SOLUTIONS', { align: 'center' });
      doc.fontSize(10).text('Solar Installation Management System', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`QUOTATION: ${quotation.quotationNumber}`);
      doc.fontSize(10).text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`);
      doc.text(`Status: ${quotation.status}`);
      doc.moveDown();

      doc.fontSize(12).text('CUSTOMER DETAILS:');
      doc.fontSize(10).text(`Name: ${quotation.customer.user.firstName} ${quotation.customer.user.lastName}`);
      doc.text(`Email: ${quotation.customer.user.email}`);
      doc.text(`Phone: ${quotation.customer.user.phone || 'N/A'}`);
      doc.text(`Address: ${quotation.customer.address || ''}, ${quotation.customer.city || ''}`);
      doc.moveDown();

      doc.fontSize(12).text('BILL OF MATERIALS / ITEMS:');
      doc.moveDown(0.5);

      quotation.items.forEach((item, index) => {
        doc.fontSize(10).text(
          `${index + 1}. ${item.description} | Qty: ${item.quantity} | Unit: Rs ${item.unitPrice} | Total: Rs ${item.totalPrice}`
        );
      });

      doc.moveDown();
      doc.fontSize(10).text(`Subtotal: Rs ${quotation.subtotal}`);
      if (Number(quotation.discountAmount) > 0) {
        doc.text(`Discount (${quotation.discountPercent}%): -Rs ${quotation.discountAmount}`);
      }
      doc.text(`Taxable Amount: Rs ${quotation.taxableAmount}`);
      doc.text(`CGST + SGST: Rs ${Number(quotation.cgst) + Number(quotation.sgst)}`);
      doc.fontSize(12).text(`TOTAL AMOUNT: Rs ${quotation.totalAmount}`);

      if (quotation.estimatedSubsidy) {
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Estimated Govt Subsidy: Rs ${quotation.estimatedSubsidy}`);
        doc.fontSize(11).text(
          `Effective Net Cost: Rs ${Number(quotation.totalAmount) - Number(quotation.estimatedSubsidy)}`
        );
      }

      doc.moveDown();
      if (quotation.termsAndConditions) {
        doc.fontSize(10).text('Terms & Conditions:');
        doc.fontSize(8).text(quotation.termsAndConditions);
      }

      doc.end();
    });
  }
}

export const quotationService = new QuotationService();
