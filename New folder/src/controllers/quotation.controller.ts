import { Response } from 'express';
import { quotationService } from '../services/quotation.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class QuotationController {
  createQuotation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const quotation = await quotationService.createQuotation(req.body, req.user!.userId);
    sendSuccess(res, 201, 'Quotation generated successfully', quotation);
  };

  getQuotations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { quotations, meta } = await quotationService.getQuotations(req.query as any);
    sendSuccess(res, 200, 'Quotations retrieved successfully', quotations, meta);
  };

  getQuotationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const quotation = await quotationService.getQuotationById(req.params.id as string);
    sendSuccess(res, 200, 'Quotation retrieved successfully', quotation);
  };

  approveQuotation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const quotation = await quotationService.approveQuotation(
      req.params.id as string,
      req.body,
      req.user!.userId
    );
    sendSuccess(res, 200, `Quotation ${req.body.approvalStatus.toLowerCase()} successfully`, quotation);
  };

  downloadPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pdfBuffer = await quotationService.generatePDF(req.params.id as string);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${req.params.id}.pdf`);
    res.send(pdfBuffer);
  };
}

export const quotationController = new QuotationController();
