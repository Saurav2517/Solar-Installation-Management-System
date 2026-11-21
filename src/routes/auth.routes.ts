import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, asyncHandler, validate } from '../middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import { updateProfileSchema } from '../validators/user.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh-token', validate(refreshTokenSchema), asyncHandler(authController.refreshToken));
router.post('/logout', asyncHandler(authController.logout));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

export default router;
