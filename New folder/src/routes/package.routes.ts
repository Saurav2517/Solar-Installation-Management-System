import { Router } from 'express';
import { solarPackageController } from '../controllers/package.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createPackageSchema,
  updatePackageSchema,
  packageQuerySchema,
} from '../validators/package.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(packageQuerySchema, 'query'), asyncHandler(solarPackageController.getPackages));
router.get('/:id', validate(uuidParam, 'params'), asyncHandler(solarPackageController.getPackageById));
router.get('/:id/bom', validate(uuidParam, 'params'), asyncHandler(solarPackageController.calculateBOM));

router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createPackageSchema),
  asyncHandler(solarPackageController.createPackage)
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(uuidParam, 'params'),
  validate(updatePackageSchema),
  asyncHandler(solarPackageController.updatePackage)
);

export default router;
