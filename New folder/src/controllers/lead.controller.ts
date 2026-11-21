import { Response } from 'express';
import { leadService } from '../services/lead.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class LeadController {
  createLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const lead = await leadService.createLead(req.body);
    sendSuccess(res, 201, 'Lead enquiry created successfully', lead);
  };

  getLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { leads, meta } = await leadService.getLeads(req.query as any);
    sendSuccess(res, 200, 'Leads retrieved successfully', leads, meta);
  };

  getLeadById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const lead = await leadService.getLeadById(req.params.id as string);
    sendSuccess(res, 200, 'Lead details retrieved successfully', lead);
  };

  updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const lead = await leadService.updateLead(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Lead updated successfully', lead);
  };

  assignSalesExecutive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const lead = await leadService.assignSalesExecutive(
      req.params.id as string,
      req.body.salesExecutiveId
    );
    sendSuccess(res, 200, 'Sales executive assigned successfully', lead);
  };

  getLeadAnalytics = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = await leadService.getLeadAnalytics();
    sendSuccess(res, 200, 'Lead conversion analytics retrieved', stats);
  };
}

export const leadController = new LeadController();
