import { Response } from 'express';
import { orderService } from '../services/order.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class OrderController {
  createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const order = await orderService.createOrderFromQuotation(req.body);
    sendSuccess(res, 201, 'Order confirmed successfully from quotation', order);
  };

  getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { orders, meta } = await orderService.getOrders(req.query as any);
    sendSuccess(res, 200, 'Orders retrieved successfully', orders, meta);
  };

  getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const order = await orderService.getOrderById(req.params.id as string);
    sendSuccess(res, 200, 'Order details retrieved successfully', order);
  };

  updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const order = await orderService.updateOrderStatus(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Order status updated successfully', order);
  };
}

export const orderController = new OrderController();
