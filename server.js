const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./src/config/database');

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration - UPDATED
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'], // Allowed frontend origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Digital Library Management System API',
    version: '1.0.0',
    documentation: '/api',
    health: '/api/health'
  });
});

// Import routes
const authRoutes = require('./src/routes/auth');
const bookRoutes = require('./src/routes/books');
const userRoutes = require('./src/routes/users');
const incidentRoutes = require('./src/routes/incidents');
const apiRoutes = require('./src/routes/index');
const loanRoutes = require('./src/routes/loans');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api', apiRoutes);
app.use('/api/loans', loanRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      auth: '/api/auth',
      books: '/api/books',
      users: '/api/users',
      incidents: '/api/incidents',
      loans: '/api/loans',
      apiDocumentation: '/api'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  const errorResponse = {
    error: message,
    status: status
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(status).json(errorResponse);
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3001, http://localhost:3002`);
  
  // Test database connection
  await testConnection();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;