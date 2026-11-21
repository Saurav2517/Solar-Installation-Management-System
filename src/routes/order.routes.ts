import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} from '../validators/order.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(createOrderSchema),
  asyncHandler(orderController.createOrder)
);

router.get('/', validate(orderQuerySchema, 'query'), asyncHandler(orderController.getOrders));
router.get('/:id', validate(uuidParam, 'params'), asyncHandler(orderController.getOrderById));

router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.WAREHOUSE_MANAGER),
  validate(uuidParam, 'params'),
  validate(updateOrderStatusSchema),
  asyncHandler(orderController.updateOrderStatus)
);

export default router;
