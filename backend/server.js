require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const apiRoutes = require('./routes/api');

// Import error handling middleware
const { apiErrorHandler } = require('./middleware/errorHandling');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// MongoDB connection with error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Setup MongoDB error handlers
  mongoose.connection.on('error', (error) => {
    apiErrorHandler.logError('MongoDB connection error', error);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected, attempting to reconnect...');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  apiErrorHandler.logError('MongoDB initial connection failed', err);
  
  // Attempt reconnection after delay
  setTimeout(() => {
    console.log('Attempting MongoDB reconnection...');
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper');
  }, 5000);
});

// Routes with error handling middleware
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Consolidated API routes (clean RESTful implementation)
app.use('/api', apiRoutes);

// Health check endpoint with comprehensive status
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    apiErrorHandler.logError('Health check failed', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Comprehensive error handling middleware
app.use(apiErrorHandler.expressMiddleware());

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      type: 'NotFoundError',
      message: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 JobScrapper Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Documentation: http://localhost:${PORT}/api/health`);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      apiErrorHandler.logError('Server error', error);
    }
  });
}

module.exports = app;