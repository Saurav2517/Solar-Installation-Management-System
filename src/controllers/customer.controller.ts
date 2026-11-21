import { Response } from 'express';
import { customerService } from '../services/customer.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class CustomerController {
  createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const customer = await customerService.createCustomer(req.body);
    sendSuccess(res, 201, 'Customer registered successfully', customer);
  };

  getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { customers, meta } = await customerService.getCustomers(req.query as any);
    sendSuccess(res, 200, 'Customers retrieved successfully', customers, meta);
  };

  getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const customer = await customerService.getCustomerById(req.params.id as string);
    sendSuccess(res, 200, 'Customer retrieved successfully', customer);
  };

  updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const customer = await customerService.updateCustomer(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Customer details updated successfully', customer);
  };

  getCustomerInstallations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const installations = await customerService.getCustomerInstallations(req.params.id as string);
    sendSuccess(res, 200, 'Customer installation history retrieved', installations);
  };

  getCustomerServiceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const serviceHistory = await customerService.getCustomerServiceHistory(req.params.id as string);
    sendSuccess(res, 200, 'Customer service history retrieved', serviceHistory);
  };
}

export const customerController = new CustomerController();
