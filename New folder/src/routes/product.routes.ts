import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(productQuerySchema, 'query'), asyncHandler(productController.getProducts));
router.get('/:id', validate(uuidParam, 'params'), asyncHandler(productController.getProductById));

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER),
  validate(createProductSchema),
  asyncHandler(productController.createProduct)
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER),
  validate(uuidParam, 'params'),
  validate(updateProductSchema),
  asyncHandler(productController.updateProduct)
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(uuidParam, 'params'),
  asyncHandler(productController.deleteProduct)
);

export default router;
