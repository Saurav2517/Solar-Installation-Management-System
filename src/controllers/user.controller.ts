import { Response } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class UserController {
  getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { users, meta } = await userService.getUsers(req.query as any);
    sendSuccess(res, 200, 'Users retrieved successfully', users, meta);
  };

  getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await userService.getUserById(req.params.id as string);
    sendSuccess(res, 200, 'User retrieved successfully', user);
  };

  createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await userService.createUser(req.body);
    sendSuccess(res, 201, 'User created successfully', user);
  };

  updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await userService.updateUser(req.params.id as string, req.body);
    sendSuccess(res, 200, 'User updated successfully', user);
  };

  deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await userService.deleteUser(req.params.id as string);
    sendSuccess(res, 200, result.message, null);
  };
}

export const userController = new UserController();
