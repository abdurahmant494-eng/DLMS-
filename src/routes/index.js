const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const bookRoutes = require('./books');
const userRoutes = require('./users');
const incidentRoutes = require('./incidents');
const loanRoutes = require('./loans');

// Use route modules
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/users', userRoutes);
router.use('/incidents', incidentRoutes);
router.use('/loans', loanRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'DLMS API'
  });
});

// API documentation endpoint - MUST BE AFTER ALL ROUTES!
router.get('/', (req, res) => {
  res.json({
    message: 'Digital Library Management System API',        
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        refreshToken: 'POST /api/auth/refresh-token',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password'
      },
      books: {
        getAll: 'GET /api/books',
        search: 'GET /api/books/search?q=query',
        getById: 'GET /api/books/:id',
        create: 'POST /api/books'
      },
      users: {
        getAll: 'GET /api/users',
        getById: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        changePassword: 'PUT /api/users/:id/change-password',
        deactivate: 'DELETE /api/users/:id',
        dashboardStats: 'GET /api/users/stats/dashboard'
      },
      incidents: {
        report: 'POST /api/incidents',
        getAll: 'GET /api/incidents',
        getById: 'GET /api/incidents/:id',
        update: 'PUT /api/incidents/:id',
        stats: 'GET /api/incidents/stats/summary'
      },
      loans: {
        getAll: 'GET /api/loans (librarian/admin only)',
        checkout: 'POST /api/loans/checkout',
        return: 'POST /api/loans/:id/return (librarian/admin)',
        renew: 'POST /api/loans/:id/renew',
        myLoans: 'GET /api/loans/my-loans',
        getById: 'GET /api/loans/:id',
        stats: 'GET /api/loans/stats/summary (librarian/admin)',
        payFine: 'POST /api/loans/:id/pay-fine'
      },
      health: 'GET /api/health'
    }
  });
});

module.exports = router;