// JobScrapper API Middleware
// Common middleware functions for the JobScrapper API routes

const Joi = require('joi');

/**
 * Request validation middleware factory
 * Creates middleware that validates request body against Joi schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }
    
    req.validatedData = value;
    next();
  };
};

/**
 * Query parameter validation middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.validatedQuery = value;
    next();
  };
};

/**
 * Async error handling wrapper
 * Wraps async route handlers to catch and forward errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * User identification middleware
 * Flexible user ID extraction from various sources
 */
const identifyUser = (req, res, next) => {
  // Extract user ID from various sources
  const userId = req.user?.id || 
                 req.headers['x-user-id'] || 
                 req.query.userId ||
                 req.body.userId;
  
  if (userId) {
    req.userId = userId;
  }
  
  next();
};

/**
 * Require user authentication
 */
const requireUser = (req, res, next) => {
  if (!req.userId && !req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide user identification'
    });
  }
  next();
};

/**
 * Pagination middleware
 * Standardizes pagination parameters
 */
const pagination = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  
  req.pagination = { page, limit, skip };
  next();
};

/**
 * Response formatter middleware
 * Standardizes API response format
 */
const formatResponse = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to format responses
  res.json = function(data) {
    if (!data.success && !data.error) {
      // Auto-format successful responses
      const formattedData = {
        success: true,
        timestamp: new Date().toISOString(),
        ...data
      };
      return originalJson.call(this, formattedData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Error response formatter
 */
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Default error response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Data validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate entry detected';
  }
  
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    message: process.env.NODE_ENV === 'development' ? err.message : errorMessage,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  validateRequest,
  validateQuery,
  asyncHandler,
  identifyUser,
  requireUser,
  pagination,
  formatResponse,
  errorHandler
};
