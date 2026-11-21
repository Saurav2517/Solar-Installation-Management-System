import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../validators/customer.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(createCustomerSchema),
  asyncHandler(customerController.createCustomer)
);

router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.SUPPORT_EXECUTIVE),
  validate(customerQuerySchema, 'query'),
  asyncHandler(customerController.getCustomers)
);

router.get('/:id', validate(uuidParam, 'params'), asyncHandler(customerController.getCustomerById));

router.patch(
  '/:id',
  validate(uuidParam, 'params'),
  validate(updateCustomerSchema),
  asyncHandler(customerController.updateCustomer)
);

router.get(
  '/:id/installations',
  validate(uuidParam, 'params'),
  asyncHandler(customerController.getCustomerInstallations)
);

router.get(
  '/:id/service-history',
  validate(uuidParam, 'params'),
  asyncHandler(customerController.getCustomerServiceHistory)
);

export default router;
