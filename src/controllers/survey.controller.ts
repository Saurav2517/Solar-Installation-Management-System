import { Response } from 'express';
import { siteSurveyService } from '../services/survey.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class SiteSurveyController {
  createSurvey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const survey = await siteSurveyService.createSurvey(req.body, req.user!.userId);
    sendSuccess(res, 201, 'Site survey recorded successfully', survey);
  };

  getSurveys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { surveys, meta } = await siteSurveyService.getSurveys(req.query as any);
    sendSuccess(res, 200, 'Site surveys retrieved successfully', surveys, meta);
  };

  getSurveyById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const survey = await siteSurveyService.getSurveyById(req.params.id as string);
    sendSuccess(res, 200, 'Site survey retrieved successfully', survey);
  };

  updateSurvey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const survey = await siteSurveyService.updateSurvey(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Site survey updated successfully', survey);
  };

  approveSurvey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const survey = await siteSurveyService.approveSurvey(
      req.params.id as string,
      req.body,
      req.user!.userId
    );
    sendSuccess(res, 200, `Site survey ${req.body.approvalStatus.toLowerCase()} successfully`, survey);
  };

  addPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const photo = await siteSurveyService.addPhoto(req.params.id as string, req.body);
    sendSuccess(res, 201, 'Survey photograph added successfully', photo);
  };

  deletePhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await siteSurveyService.deletePhoto(req.params.photoId as string);
    sendSuccess(res, 200, result.message, null);
  };
}

export const siteSurveyController = new SiteSurveyController();
