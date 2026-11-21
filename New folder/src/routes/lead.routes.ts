import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createLeadSchema,
  updateLeadSchema,
  assignSalesExecutiveSchema,
  leadQuerySchema,
} from '../validators/lead.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.SUPPORT_EXECUTIVE),
  validate(createLeadSchema),
  asyncHandler(leadController.createLead)
);

router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.SUPPORT_EXECUTIVE),
  validate(leadQuerySchema, 'query'),
  asyncHandler(leadController.getLeads)
);

router.get(
  '/analytics',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  asyncHandler(leadController.getLeadAnalytics)
);

router.get('/:id', validate(uuidParam, 'params'), asyncHandler(leadController.getLeadById));

router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(uuidParam, 'params'),
  validate(updateLeadSchema),
  asyncHandler(leadController.updateLead)
);

router.patch(
  '/:id/assign',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(uuidParam, 'params'),
  validate(assignSalesExecutiveSchema),
  asyncHandler(leadController.assignSalesExecutive)
);

export default router;
