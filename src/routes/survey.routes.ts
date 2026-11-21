import { Router } from 'express';
import { siteSurveyController } from '../controllers/survey.controller';
import { authenticate, authorize, asyncHandler, validate } from '../middleware';
import { UserRole } from '@prisma/client';
import { uuidParam } from '../validators/common.validator';
import {
  createSurveySchema,
  updateSurveySchema,
  approveSurveySchema,
  addSurveyPhotoSchema,
  surveyQuerySchema,
} from '../validators/survey.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.INSTALLATION_TECHNICIAN),
  validate(createSurveySchema),
  asyncHandler(siteSurveyController.createSurvey)
);

router.get(
  '/',
  authorize(
    UserRole.ADMIN,
    UserRole.SALES_EXECUTIVE,
    UserRole.INSTALLATION_TECHNICIAN,
    UserRole.SUPPORT_EXECUTIVE
  ),
  validate(surveyQuerySchema, 'query'),
  asyncHandler(siteSurveyController.getSurveys)
);

router.get('/:id', validate(uuidParam, 'params'), asyncHandler(siteSurveyController.getSurveyById));

router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.INSTALLATION_TECHNICIAN),
  validate(uuidParam, 'params'),
  validate(updateSurveySchema),
  asyncHandler(siteSurveyController.updateSurvey)
);

router.post(
  '/:id/approve',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  validate(uuidParam, 'params'),
  validate(approveSurveySchema),
  asyncHandler(siteSurveyController.approveSurvey)
);

router.post(
  '/:id/photos',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE, UserRole.INSTALLATION_TECHNICIAN),
  validate(uuidParam, 'params'),
  validate(addSurveyPhotoSchema),
  asyncHandler(siteSurveyController.addPhoto)
);

router.delete(
  '/photos/:photoId',
  authorize(UserRole.ADMIN, UserRole.SALES_EXECUTIVE),
  asyncHandler(siteSurveyController.deletePhoto)
);

export default router;
