import { Response } from 'express';
import { solarPackageService } from '../services/package.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class SolarPackageController {
  createPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pkg = await solarPackageService.createPackage(req.body);
    sendSuccess(res, 201, 'Solar package created successfully', pkg);
  };

  getPackages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { packages, meta } = await solarPackageService.getPackages(req.query as any);
    sendSuccess(res, 200, 'Solar packages retrieved successfully', packages, meta);
  };

  getPackageById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pkg = await solarPackageService.getPackageById(req.params.id as string);
    sendSuccess(res, 200, 'Solar package retrieved successfully', pkg);
  };

  updatePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pkg = await solarPackageService.updatePackage(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Solar package updated successfully', pkg);
  };

  calculateBOM = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const bom = await solarPackageService.calculateBOM(
      req.params.id as string,
      req.query.customCapacityKw ? parseFloat(req.query.customCapacityKw as string) : undefined
    );
    sendSuccess(res, 200, 'Bill of Materials calculated successfully', bom);
  };
}

export const solarPackageController = new SolarPackageController();
