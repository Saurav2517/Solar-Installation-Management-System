import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const deviceInfo = req.headers['user-agent'];
    const result = await authService.register(req.body, deviceInfo);
    sendSuccess(res, 201, 'User registered successfully', result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const deviceInfo = req.headers['user-agent'];
    const result = await authService.login(req.body, deviceInfo);

    // Also set refresh token as httpOnly cookie if desired
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, 200, 'Login successful', result);
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    const deviceInfo = req.headers['user-agent'];
    const tokens = await authService.refreshTokens(token, deviceInfo);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, 200, 'Token refreshed successfully', tokens);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    await authService.logout(token);
    res.clearCookie('refreshToken');
    sendSuccess(res, 200, 'Logged out successfully', null);
  };

  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await authService.changePassword(req.user!.userId, req.body);
    res.clearCookie('refreshToken');
    sendSuccess(res, 200, 'Password changed successfully. Please log in again.', null);
  };

  getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await authService.getMe(req.user!.userId);
    sendSuccess(res, 200, 'Current user profile retrieved', user);
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    sendSuccess(res, 200, 'Profile updated successfully', user);
  };
}

export const authController = new AuthController();
