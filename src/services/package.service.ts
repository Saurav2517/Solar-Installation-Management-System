import Decimal from 'decimal.js';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
  CreatePackageInput,
  UpdatePackageInput,
  PackageQueryInput,
} from '../validators/package.validator';
import { buildPaginationMeta, getPrismaSkip, parsePagination } from '../utils';
import { Prisma } from '@prisma/client';

export class SolarPackageService {
  /**
   * Create a standard solar package with component mapping
   */
  async createPackage(input: CreatePackageInput) {
    const existing = await prisma.solarPackage.findUnique({
      where: {
        systemType_capacityKw: {
          systemType: input.systemType,
          capacityKw: input.capacityKw,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `Package for ${input.systemType} with ${input.capacityKw} kW capacity already exists`
      );
    }

    return prisma.solarPackage.create({
      data: {
        name: input.name,
        description: input.description,
        systemType: input.systemType,
        capacityKw: input.capacityKw,
        basePrice: input.basePrice,
        isActive: input.isActive ?? true,
        components: input.components && input.components.length > 0
          ? {
              create: input.components.map((c) => ({
                productId: c.productId,
                quantity: c.quantity,
                isOptional: c.isOptional || false,
              })),
            }
          : undefined,
      },
      include: {
        components: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * List packages with filtering
   */
  async getPackages(query: PackageQueryInput) {
    const pagination = parsePagination(query);
    const skip = getPrismaSkip(pagination);

    const where: Prisma.SolarPackageWhereInput = {};

    if (query.systemType) {
      where.systemType = query.systemType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { description: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const [total, packages] = await Promise.all([
      prisma.solarPackage.count({ where }),
      prisma.solarPackage.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'capacityKw']: pagination.sortOrder || 'asc',
        },
        include: {
          components: {
            include: { product: true },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(total, pagination);
    return { packages, meta };
  }

  /**
   * Get package by ID with all components
   */
  async getPackageById(id: string) {
    const pkg = await prisma.solarPackage.findUnique({
      where: { id },
      include: {
        components: {
          include: { product: true },
        },
      },
    });

    if (!pkg) {
      throw ApiError.notFound('Solar package not found');
    }

    return pkg;
  }

  /**
   * Update package details or components
   */
  async updatePackage(id: string, input: UpdatePackageInput) {
    const pkg = await prisma.solarPackage.findUnique({ where: { id } });
    if (!pkg) {
      throw ApiError.notFound('Solar package not found');
    }

    return prisma.$transaction(async (tx) => {
      if (input.components) {
        // Replace existing components
        await tx.packageComponent.deleteMany({ where: { packageId: id } });
        await tx.packageComponent.createMany({
          data: input.components.map((c) => ({
            packageId: id,
            productId: c.productId,
            quantity: c.quantity,
            isOptional: c.isOptional || false,
          })),
        });
      }

      return tx.solarPackage.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          basePrice: input.basePrice,
          isActive: input.isActive,
        },
        include: {
          components: {
            include: { product: true },
          },
        },
      });
    });
  }

  /**
   * Automatic Bill of Materials (BOM) calculation
   * Dynamically calculates component quantities and total costs
   * based on package components and optional capacity scaling.
   */
  async calculateBOM(packageId: string, customCapacityKw?: number) {
    const pkg = await this.getPackageById(packageId);

    const baseKw = new Decimal(pkg.capacityKw.toString());
    const scaleFactor = customCapacityKw
      ? new Decimal(customCapacityKw).dividedBy(baseKw)
      : new Decimal(1);

    let totalMaterialCost = new Decimal(0);
    let totalTax = new Decimal(0);

    const items = pkg.components.map((comp) => {
      const baseQty = new Decimal(comp.quantity);
      // Scale quantity proportionally if capacity was adjusted, rounding up
      const scaledQty = scaleFactor.equals(1)
        ? comp.quantity
        : Math.ceil(baseQty.times(scaleFactor).toNumber());

      const unitPrice = new Decimal(comp.product.unitPrice.toString());
      const gstRate = new Decimal(comp.product.gstRate.toString());
      const lineSubtotal = unitPrice.times(scaledQty);
      const lineTax = lineSubtotal.times(gstRate).dividedBy(100);
      const lineTotal = lineSubtotal.plus(lineTax);

      totalMaterialCost = totalMaterialCost.plus(lineSubtotal);
      totalTax = totalTax.plus(lineTax);

      return {
        productId: comp.product.id,
        productName: comp.product.name,
        category: comp.product.category,
        brand: comp.product.brand,
        model: comp.product.model,
        unit: comp.product.unit,
        unitPrice: unitPrice.toNumber(),
        gstRate: gstRate.toNumber(),
        quantity: scaledQty,
        subtotal: lineSubtotal.toDecimalPlaces(2).toNumber(),
        taxAmount: lineTax.toDecimalPlaces(2).toNumber(),
        totalAmount: lineTotal.toDecimalPlaces(2).toNumber(),
        isOptional: comp.isOptional,
      };
    });

    const grandTotal = totalMaterialCost.plus(totalTax);

    return {
      package: {
        id: pkg.id,
        name: pkg.name,
        systemType: pkg.systemType,
        baseCapacityKw: pkg.capacityKw,
        calculatedCapacityKw: customCapacityKw || pkg.capacityKw,
      },
      bomItems: items,
      summary: {
        materialSubtotal: totalMaterialCost.toDecimalPlaces(2).toNumber(),
        totalTax: totalTax.toDecimalPlaces(2).toNumber(),
        estimatedBasePrice: pkg.basePrice,
        grandTotal: grandTotal.toDecimalPlaces(2).toNumber(),
      },
    };
  }
}

export const solarPackageService = new SolarPackageService();
