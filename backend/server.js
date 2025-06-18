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

// Import performance optimization
const { queryOptimizer, indexManager } = require('./utils/databaseOptimizer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Enhanced logging with performance monitoring
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      // Parse response time from morgan log
      const responseTimeMatch = message.match(/(\d+)ms/);
      if (responseTimeMatch) {
        const responseTime = parseInt(responseTimeMatch[1]);
        
        // Record slow requests
        if (responseTime > 1000) {
          console.warn(`Slow request detected: ${responseTime}ms - ${message.trim()}`);
        }
        // Could integrate with performance monitoring here
        // performanceMonitor.recordMetric('api', 'request_duration', responseTime);
      }
      
      process.stdout.write(message);
    }
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced rate limiting with performance considerations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        type: 'RateLimitError',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(limiter.windowMs / 1000)
      }
    });
  }
});
app.use('/api/', limiter);

// MongoDB connection with error handling and optimization
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0 // Disable mongoose buffering
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Initialize database optimization
  console.log('🚀 Initializing database optimization...');
  
  // Create database indexes for optimal performance
  try {
    await indexManager.createIndexes();
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error);
  }
  
  // Initialize query optimizer
  await queryOptimizer.initialize();
  console.log('✅ Database query optimizer initialized');
  
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

// Performance monitoring middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  // Override res.json to measure response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    // Add performance headers
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Log slow API responses
    if (responseTime > 500) {
      console.warn(`Slow API response: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

// Routes with error handling middleware
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Consolidated API routes (clean RESTful implementation)
app.use('/api', apiRoutes);

// Enhanced health check endpoint with comprehensive status
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Test database query performance
    let dbResponseTime = 0;
    if (mongoStatus === 'connected') {
      const dbStart = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        dbResponseTime = Date.now() - dbStart;
      } catch (error) {
        console.warn('Database ping failed:', error);
      }
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get query optimizer stats
    const optimizerStats = queryOptimizer.getStats();
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        responseTime: dbResponseTime
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      performance: {
        responseTime: Date.now() - startTime,
        queryOptimizer: {
          cacheHitRate: optimizerStats.cache.hitRate,
          cacheSize: optimizerStats.cache.size
        }
      }
    };
    
    // Determine overall health status
    const isHealthy = mongoStatus === 'connected' && 
                     dbResponseTime < 1000 && 
                     memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9;
    
    res.status(isHealthy ? 200 : 503).json(healthData);
  } catch (error) {
    apiErrorHandler.logError('Health check failed', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Performance metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const stats = queryOptimizer.getStats();
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: stats
    };
    
    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiErrorHandler.logError('Metrics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
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