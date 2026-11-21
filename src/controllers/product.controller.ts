import { Response } from 'express';
import { productService } from '../services/product.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class ProductController {
  createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, 201, 'Product created successfully', product);
  };

  getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { products, meta } = await productService.getProducts(req.query as any);
    sendSuccess(res, 200, 'Products retrieved successfully', products, meta);
  };

  getProductById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const product = await productService.getProductById(req.params.id as string);
    sendSuccess(res, 200, 'Product retrieved successfully', product);
  };

  updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    sendSuccess(res, 200, 'Product updated successfully', product);
  };

  deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const product = await productService.deleteProduct(req.params.id as string);
    sendSuccess(res, 200, 'Product deactivated successfully', product);
  };
}

export const productController = new ProductController();
