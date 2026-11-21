import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderQueryInput,
} from '../validators/order.validator';
import {
  buildPaginationMeta,
  generateReferenceNumber,
  getPrismaSkip,
  parsePagination,
} from '../utils';
import { OrderStatus, Prisma, QuotationStatus } from '@prisma/client';

export class OrderService {
  /**
   * Convert an approved quotation into a confirmed customer order
   */
  async createOrderFromQuotation(input: CreateOrderInput) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: input.quotationId },
    });

    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.APPROVED) {
      throw ApiError.badRequest(
        `Only APPROVED quotations can be converted to an order. Current status: ${quotation.status}`
      );
    }

    // Check if order already exists for this quotation
    const existingOrder = await prisma.order.findFirst({
      where: { quotationId: input.quotationId },
    });

    if (existingOrder) {
      throw ApiError.conflict(`An order (${existingOrder.orderNumber}) has already been created for this quotation`);
    }

    const orderNumber = generateReferenceNumber('ORD');

    return prisma.order.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        totalAmount: quotation.totalAmount,
        paidAmount: 0,
        balanceAmount: quotation.totalAmount,
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        notes: input.notes,
      },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        quotation: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  /**
   * Get orders with pagination and filtering
   */
  async getOrders(query: OrderQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.OrderWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (pagination.search) {
      where.OR = [
        { orderNumber: { contains: pagination.search, mode: 'insensitive' } },
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

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
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
          quotation: {
            select: {
              quotationNumber: true,
              totalAmount: true,
            },
          },
          installations: {
            select: {
              id: true,
              installationNumber: true,
              status: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentType: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { orders, meta };
  }

  /**
   * Get single order by ID
   */
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        quotation: {
          include: {
            items: {
              include: { product: true },
            },
            package: true,
          },
        },
        installations: {
          include: {
            photos: true,
            technicianAssignments: {
              include: { technician: true },
            },
          },
        },
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: string, input: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: input.status,
      notes: input.notes,
    };

    if (input.status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
      },
    });
  }
}

export const orderService = new OrderService();
