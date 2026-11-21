import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createUserByAdminSchema,
  adminUpdateUserSchema,
  userQuerySchema,
} from '../validators/user.validator';

const router = Router();

// All user management routes require Admin role
router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/', validate(userQuerySchema, 'query'), asyncHandler(userController.getUsers));
router.post('/', validate(createUserByAdminSchema), asyncHandler(userController.createUser));
router.get('/:id', validate(uuidParam, 'params'), asyncHandler(userController.getUserById));
router.patch(
  '/:id',
  validate(uuidParam, 'params'),
  validate(adminUpdateUserSchema),
  asyncHandler(userController.updateUser)
);
router.delete('/:id', validate(uuidParam, 'params'), asyncHandler(userController.deleteUser));

export default router;
