import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, requestLogger } from './middleware';
import { sendSuccess } from './utils';
import router from './routes';

const createApp = (): Application => {
  const app = express();

  // ---- Security Middleware ----
  app.use(helmet());

  // ---- CORS ----
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ---- Rate Limiting ----
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ---- Body Parsing ----
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ---- Compression ----
  app.use(compression());

  // ---- Request Logging ----
  app.use(requestLogger);

  // ---- Health Check ----
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, 200, 'Server is running', {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.app.env,
      version: '1.0.0',
    });
  });

  // ---- API Routes ----
  app.use(`/api/${config.app.apiVersion}`, router);

  // ---- 404 Handler ----
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // ---- Global Error Handler ----
  app.use(errorHandler);

  return app;
};

export default createApp;
