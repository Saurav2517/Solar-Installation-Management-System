import { Router } from 'express';
import { quotationController } from '../controllers/quotation.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createQuotationSchema,
  approveQuotationSchema,
  quotationQuerySchema,
} from '../validators/quotation.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(createQuotationSchema),
  asyncHandler(quotationController.createQuotation)
);

router.get(
  '/',
  validate(quotationQuerySchema, 'query'),
  asyncHandler(quotationController.getQuotations)
);

router.get('/:id', validate(uuidParam, 'params'), asyncHandler(quotationController.getQuotationById));

router.post(
  '/:id/approve',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.CUSTOMER),
  validate(uuidParam, 'params'),
  validate(approveQuotationSchema),
  asyncHandler(quotationController.approveQuotation)
);

router.get(
  '/:id/pdf',
  validate(uuidParam, 'params'),
  asyncHandler(quotationController.downloadPDF)
);

export default router;
