import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils';
import authRouter from './auth.routes';
import userRouter from './user.routes';
import customerRouter from './customer.routes';
import leadRouter from './lead.routes';
import surveyRouter from './survey.routes';
import productRouter from './product.routes';
import packageRouter from './package.routes';
import quotationRouter from './quotation.routes';
import orderRouter from './order.routes';

const router = Router();

// Sub-routers
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/customers', customerRouter);
router.use('/leads', leadRouter);
router.use('/surveys', surveyRouter);
router.use('/products', productRouter);
router.use('/packages', packageRouter);
router.use('/quotations', quotationRouter);
router.use('/orders', orderRouter);

// API Root - lists available endpoints
router.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'SIMS API v1', {
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        refreshToken: 'POST /api/v1/auth/refresh-token',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
        updateProfile: 'PATCH /api/v1/auth/me',
        changePassword: 'POST /api/v1/auth/change-password',
      },
      users: {
        list: 'GET /api/v1/users (Admin)',
        create: 'POST /api/v1/users (Admin)',
        getById: 'GET /api/v1/users/:id (Admin)',
        update: 'PATCH /api/v1/users/:id (Admin)',
        delete: 'DELETE /api/v1/users/:id (Admin)',
      },
      customers: {
        create: 'POST /api/v1/customers',
        list: 'GET /api/v1/customers',
        getById: 'GET /api/v1/customers/:id',
        update: 'PATCH /api/v1/customers/:id',
        installations: 'GET /api/v1/customers/:id/installations',
        serviceHistory: 'GET /api/v1/customers/:id/service-history',
      },
      leads: {
        create: 'POST /api/v1/leads',
        list: 'GET /api/v1/leads',
        analytics: 'GET /api/v1/leads/analytics',
        getById: 'GET /api/v1/leads/:id',
        update: 'PATCH /api/v1/leads/:id',
        assign: 'PATCH /api/v1/leads/:id/assign',
      },
      surveys: {
        create: 'POST /api/v1/surveys',
        list: 'GET /api/v1/surveys',
        getById: 'GET /api/v1/surveys/:id',
        update: 'PATCH /api/v1/surveys/:id',
        approve: 'POST /api/v1/surveys/:id/approve',
        addPhoto: 'POST /api/v1/surveys/:id/photos',
        deletePhoto: 'DELETE /api/v1/surveys/photos/:photoId',
      },
      products: {
        create: 'POST /api/v1/products',
        list: 'GET /api/v1/products',
        getById: 'GET /api/v1/products/:id',
        update: 'PATCH /api/v1/products/:id',
        delete: 'DELETE /api/v1/products/:id',
      },
      packages: {
        create: 'POST /api/v1/packages',
        list: 'GET /api/v1/packages',
        getById: 'GET /api/v1/packages/:id',
        update: 'PATCH /api/v1/packages/:id',
        calculateBOM: 'GET /api/v1/packages/:id/bom',
      },
      quotations: {
        create: 'POST /api/v1/quotations',
        list: 'GET /api/v1/quotations',
        getById: 'GET /api/v1/quotations/:id',
        approve: 'POST /api/v1/quotations/:id/approve',
        downloadPDF: 'GET /api/v1/quotations/:id/pdf',
      },
      orders: {
        create: 'POST /api/v1/orders',
        list: 'GET /api/v1/orders',
        getById: 'GET /api/v1/orders/:id',
        updateStatus: 'PATCH /api/v1/orders/:id/status',
      },
      inventory: '/api/v1/inventory (Phase 5)',
      installations: '/api/v1/installations (Phase 6)',
      warranties: '/api/v1/warranties (Phase 6)',
      serviceTickets: '/api/v1/service-tickets (Phase 7)',
      payments: '/api/v1/payments (Phase 8)',
      invoices: '/api/v1/invoices (Phase 8)',
      expenses: '/api/v1/expenses (Phase 8)',
      subsidies: '/api/v1/subsidies (Phase 8)',
      solarReadings: '/api/v1/solar-readings (Phase 9)',
      notifications: '/api/v1/notifications',
    },
    documentation: '/api-docs',
  });
});

export default router;
