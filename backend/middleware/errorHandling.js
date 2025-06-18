// Backend API Error Handling Middleware and Patterns
// Comprehensive error handling for Express.js backend with recovery strategies

import { ErrorHandler } from '../extension/src/utils/errorHandler.js';

/**
 * API Error Handler with Express.js integration
 */
export class APIErrorHandler extends ErrorHandler {
  constructor(options = {}) {
    super({
      ...options,
      enableLogging: true,
      logLevel: 'info'
    });
    
    this.circuitBreakers = new Map();
    this.healthChecks = new Map();
  }

  /**
   * Express middleware for comprehensive error handling
   */
  expressMiddleware() {
    return (error, req, res, next) => {
      const context = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      };

      this.handleAPIError(error, req, res, context);
    };
  }

  /**
   * Database operation error handling with connection recovery
   */
  async withDatabaseRecovery(dbOperation, context = {}) {
    return await this.withNetworkRecovery(async () => {
      try {
        return await dbOperation();
      } catch (error) {
        // Classify database errors
        const errorType = this.classifyDatabaseError(error);
        
        switch (errorType) {
          case 'CONNECTION_ERROR':
            throw new DatabaseConnectionError('Database connection failed', error);
          case 'TIMEOUT_ERROR':
            throw new DatabaseTimeoutError('Database operation timed out', error);
          case 'CONSTRAINT_ERROR':
            throw new DatabaseConstraintError('Database constraint violation', error);
          default:
            throw error;
        }
      }
    }, { ...context, operation: 'database' });
  }

  /**
   * External API integration error handling
   */
  async withExternalAPIRecovery(apiCall, context = {}) {
    const circuitBreaker = this.getCircuitBreaker(context.service);
    
    if (circuitBreaker.isOpen()) {
      throw new CircuitBreakerOpenError(`Circuit breaker open for ${context.service}`);
    }

    try {
      const result = await this.withNetworkRecovery(apiCall, context);
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      
      // Apply fallback strategies
      return await this.applyExternalAPIFallback(error, context);
    }
  }

  /**
   * Request validation with detailed error responses
   */
  async validateRequestSafely(validator, data, context = {}) {
    try {
      return await validator(data);
    } catch (error) {
      const validationError = new RequestValidationError(
        'Request validation failed',
        this.extractValidationDetails(error)
      );
      
      this.logWarning('Request validation failed', validationError, context);
      throw validationError;
    }
  }

  /**
   * File upload error handling with cleanup
   */
  async withFileUploadRecovery(uploadOperation, context = {}) {
    let tempFiles = [];
    
    try {
      return await uploadOperation();
    } catch (error) {
      // Cleanup temporary files on error
      await this.cleanupTempFiles(tempFiles);
      
      const errorType = this.classifyFileError(error);
      
      switch (errorType) {
        case 'SIZE_LIMIT_EXCEEDED':
          throw new FileSizeError('File size exceeds limit', error);
        case 'INVALID_FILE_TYPE':
          throw new FileTypeError('Invalid file type', error);
        case 'UPLOAD_FAILED':
          throw new FileUploadError('File upload failed', error);
        default:
          throw error;
      }
    }
  }

  /**
   * Handle API errors with appropriate HTTP responses
   */
  handleAPIError(error, req, res, context) {
    let statusCode = 500;
    let errorResponse = {
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message,
        timestamp: context.timestamp,
        requestId: context.requestId || this.generateRequestId()
      }
    };

    // Classify error and set appropriate status code
    if (error instanceof RequestValidationError) {
      statusCode = 400;
      errorResponse.error.details = error.details;
    } else if (error instanceof UnauthorizedError) {
      statusCode = 401;
    } else if (error instanceof ForbiddenError) {
      statusCode = 403;
    } else if (error instanceof NotFoundError) {
      statusCode = 404;
    } else if (error instanceof ConflictError) {
      statusCode = 409;
    } else if (error instanceof RateLimitError) {
      statusCode = 429;
      errorResponse.error.retryAfter = error.retryAfter;
    } else if (error instanceof CircuitBreakerOpenError) {
      statusCode = 503;
      errorResponse.error.service = error.service;
    }

    // Log error with appropriate level
    if (statusCode >= 500) {
      this.logError('Server error', error, context);
    } else {
      this.logWarning('Client error', error, context);
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Classify database errors for targeted handling
   */
  classifyDatabaseError(error) {
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_ERROR';
    if (error.code === 'ETIMEDOUT') return 'TIMEOUT_ERROR';
    if (error.code === 11000) return 'DUPLICATE_KEY_ERROR';
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    if (error.name === 'CastError') return 'CAST_ERROR';
    
    return 'UNKNOWN_DATABASE_ERROR';
  }

  /**
   * Get or create circuit breaker for service
   */
  getCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker({
        threshold: 5,
        timeout: 60000,
        resetTimeout: 300000
      }));
    }
    
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Apply fallback strategies for external API failures
   */
  async applyExternalAPIFallback(error, context) {
    const fallbackStrategies = {
      'job-search-api': () => this.useJobSearchCache(context),
      'email-service': () => this.queueEmailForLater(context),
      'analytics-api': () => this.storeAnalyticsLocally(context)
    };

    const fallback = fallbackStrategies[context.service];
    if (fallback) {
      this.logInfo(`Applying fallback for ${context.service}`, context);
      return await fallback();
    }

    throw error;
  }

  /**
   * Extract validation error details
   */
  extractValidationDetails(error) {
    if (error.details) {
      return error.details.map(detail => ({
        field: detail.path?.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
    }
    
    return [{ message: error.message }];
  }

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Circuit Breaker implementation for external services
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.resetTimeout = options.resetTimeout || 300000;
    
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Custom Error Classes
export class DatabaseConnectionError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.originalError = originalError;
  }
}

export class DatabaseTimeoutError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseTimeoutError';
    this.originalError = originalError;
  }
}

export class DatabaseConstraintError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseConstraintError';
    this.originalError = originalError;
  }
}

export class RequestValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'RequestValidationError';
    this.details = details;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message, service) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.service = service;
  }
}

export class FileSizeError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'FileSizeError';
    this.originalError = originalError;
  }
}

export class FileTypeError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'FileTypeError';
    this.originalError = originalError;
  }
}

export class FileUploadError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'FileUploadError';
    this.originalError = originalError;
  }
}

export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Export singleton instance
export const apiErrorHandler = new APIErrorHandler();
export default APIErrorHandler;
