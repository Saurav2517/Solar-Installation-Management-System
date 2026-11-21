import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from '../validators/product.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { Prisma } from '@prisma/client';

export class ProductService {
  /**
   * Create new product/component
   */
  async createProduct(input: CreateProductInput) {
    return prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        brand: input.brand,
        model: input.model,
        specifications: input.specifications as Prisma.InputJsonValue,
        unitPrice: input.unitPrice,
        unit: input.unit || 'piece',
        hsnCode: input.hsnCode,
        gstRate: input.gstRate || 0,
        warrantyMonths: input.warrantyMonths,
        warrantyEvent: input.warrantyEvent,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(query: ProductQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.ProductWhereInput = {};

    if (query.category) {
      where.category = query.category;
    }

    if (query.brand) {
      where.brand = { contains: query.brand, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { description: { contains: pagination.search, mode: 'insensitive' } },
        { model: { contains: pagination.search, mode: 'insensitive' } },
        { category: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
        include: {
          inventory: true,
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { products, meta };
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
        packageComponents: {
          include: { package: true },
        },
      },
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return product;
  }

  /**
   * Update product
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...input,
        specifications: input.specifications as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Deactivate product
   */
  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const productService = new ProductService();
