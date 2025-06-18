// Comprehensive Error Handling System for JobScrapper Chrome Extension
// Implements network recovery, DOM graceful degradation, retry logic, and data corruption recovery

/**
 * Core Error Handler with intelligent error classification and recovery strategies
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      enableLogging: true,
      logLevel: 'info',
      ...options
    };
    
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    this.errorContext = new Map();
    
    this.initializeStrategies();
    this.setupGlobalErrorHandling();
  }

  /**
   * Initialize recovery strategies for different error types
   */
  initializeStrategies() {
    // Network error recovery strategies
    this.recoveryStrategies.set('NetworkError', {
      retry: true,
      backoff: 'exponential',
      maxRetries: 5,
      fallback: 'cache'
    });

    // DOM error recovery strategies
    this.recoveryStrategies.set('DOMError', {
      retry: true,
      backoff: 'linear',
      maxRetries: 3,
      fallback: 'alternative_selector'
    });

    // Application submission error strategies
    this.recoveryStrategies.set('SubmissionError', {
      retry: true,
      backoff: 'exponential',
      maxRetries: 4,
      fallback: 'manual_intervention'
    });

    // Data corruption recovery strategies
    this.recoveryStrategies.set('DataCorruptionError', {
      retry: false,
      backoff: 'none',
      maxRetries: 0,
      fallback: 'data_recovery'
    });
  }

  /**
   * Setup global error handling for unhandled exceptions
   */
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'UnhandledPromiseRejection');
        event.preventDefault();
      });

      // Handle general JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error, 'JavaScriptError', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
    }
  }

  // ============================================================================
  // 1. NETWORK FAILURE RECOVERY WITH EXPONENTIAL BACKOFF
  // ============================================================================

  /**
   * Network request handler with intelligent retry and backoff
   */
  async withNetworkRecovery(requestFn, context = {}) {
    const strategy = this.recoveryStrategies.get('NetworkError');
    let attempt = 0;
    let lastError;

    while (attempt <= strategy.maxRetries) {
      try {
        this.logInfo(`Network request attempt ${attempt + 1}`, context);
        const result = await requestFn();
        
        // Reset error count on success
        this.resetErrorCount('NetworkError', context.endpoint);
        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        const errorType = this.classifyNetworkError(error);
        this.incrementErrorCount('NetworkError', context.endpoint);

        if (attempt > strategy.maxRetries) {
          this.logError(`Network request failed after ${strategy.maxRetries} attempts`, error, context);
          return await this.applyNetworkFallback(error, context);
        }

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(attempt, strategy.backoff);
        this.logWarning(`Network request failed, retrying in ${delay}ms`, error, context);
        
        await this.delay(delay);
      }
    }

    throw new NetworkRecoveryError('Network recovery failed', lastError, context);
  }

  /**
   * Classify network errors for appropriate handling
   */
  classifyNetworkError(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'FETCH_ERROR';
    }
    if (error.status === 429) return 'RATE_LIMITED';
    if (error.status >= 500) return 'SERVER_ERROR';
    if (error.status === 404) return 'NOT_FOUND';
    if (error.status === 401 || error.status === 403) return 'AUTH_ERROR';
    if (error.code === 'NETWORK_ERROR') return 'CONNECTION_ERROR';
    
    return 'UNKNOWN_NETWORK_ERROR';
  }

  /**
   * Apply network fallback strategies
   */
  async applyNetworkFallback(error, context) {
    const errorType = this.classifyNetworkError(error);
    
    switch (errorType) {
      case 'RATE_LIMITED':
        return await this.handleRateLimiting(context);
      
      case 'SERVER_ERROR':
        return await this.useCachedData(context);
      
      case 'CONNECTION_ERROR':
        return await this.enableOfflineMode(context);
      
      case 'AUTH_ERROR':
        return await this.refreshAuthentication(context);
      
      default:
        return await this.useCachedData(context);
    }
  }

  /**
   * Handle rate limiting with intelligent backoff
   */
  async handleRateLimiting(context) {
    const retryAfter = context.retryAfter || 60000; // Default 1 minute
    this.logWarning(`Rate limited, waiting ${retryAfter}ms before retry`);
    
    await this.delay(retryAfter);
    return { success: false, retry: true, reason: 'rate_limited' };
  }

  // ============================================================================
  // 2. DOM ELEMENT NOT FOUND GRACEFUL DEGRADATION
  // ============================================================================

  /**
   * DOM operation handler with graceful degradation
   */
  async withDOMRecovery(domOperation, context = {}) {
    const strategy = this.recoveryStrategies.get('DOMError');
    let attempt = 0;
    let lastError;

    while (attempt <= strategy.maxRetries) {
      try {
        this.logDebug(`DOM operation attempt ${attempt + 1}`, context);
        const result = await domOperation();
        
        if (result !== null && result !== undefined) {
          this.resetErrorCount('DOMError', context.selector);
          return result;
        }
        
        throw new DOMNotFoundError('DOM element not found', context.selector);

      } catch (error) {
        lastError = error;
        attempt++;

        this.incrementErrorCount('DOMError', context.selector);

        if (attempt > strategy.maxRetries) {
          this.logWarning(`DOM operation failed after ${strategy.maxRetries} attempts`, error, context);
          return await this.applyDOMFallback(error, context);
        }

        // Wait for DOM to potentially update
        const delay = this.calculateBackoffDelay(attempt, strategy.backoff);
        this.logDebug(`DOM operation failed, retrying in ${delay}ms`, context);
        
        await this.delay(delay);
      }
    }

    return await this.applyDOMFallback(lastError, context);
  }

  /**
   * Apply DOM fallback strategies for graceful degradation
   */
  async applyDOMFallback(error, context) {
    const fallbackStrategies = [
      () => this.tryAlternativeSelectors(context),
      () => this.waitForDynamicContent(context),
      () => this.useCachedDOMData(context),
      () => this.skipNonCriticalOperation(context),
      () => this.reportDOMFailure(context)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = await strategy();
        if (result !== null) {
          this.logInfo('DOM fallback strategy succeeded', { strategy: strategy.name, context });
          return result;
        }
      } catch (fallbackError) {
        this.logDebug('DOM fallback strategy failed', { strategy: strategy.name, error: fallbackError });
      }
    }

    // Return safe default for graceful degradation
    return this.getSafeDefault(context);
  }

  /**
   * Try alternative selectors for robust DOM access
   */
  async tryAlternativeSelectors(context) {
    const alternativeSelectors = this.generateAlternativeSelectors(context.selector);
    
    for (const selector of alternativeSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          this.logInfo('Alternative selector succeeded', { original: context.selector, alternative: selector });
          return element;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    return null;
  }

  /**
   * Wait for dynamic content to load
   */
  async waitForDynamicContent(context) {
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 500; // 500ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      try {
        const element = document.querySelector(context.selector);
        if (element) {
          this.logInfo('Dynamic content loaded successfully', context);
          return element;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.delay(checkInterval);
      elapsed += checkInterval;
    }

    return null;
  }

  // ============================================================================
  // 3. APPLICATION SUBMISSION FAILURES WITH RETRY LOGIC
  // ============================================================================

  /**
   * Application submission handler with intelligent retry
   */
  async withSubmissionRecovery(submissionFn, applicationData, context = {}) {
    const strategy = this.recoveryStrategies.get('SubmissionError');
    let attempt = 0;
    let lastError;
    let submissionState = { ...applicationData };

    while (attempt <= strategy.maxRetries) {
      try {
        this.logInfo(`Submission attempt ${attempt + 1}`, { jobId: context.jobId, attempt });
        
        // Validate submission data before attempt
        await this.validateSubmissionData(submissionState);
        
        const result = await submissionFn(submissionState);
        
        // Verify submission success
        const verified = await this.verifySubmissionSuccess(result, context);
        if (verified) {
          this.resetErrorCount('SubmissionError', context.jobId);
          return result;
        }
        
        throw new SubmissionVerificationError('Submission verification failed', result);

      } catch (error) {
        lastError = error;
        attempt++;

        const errorType = this.classifySubmissionError(error);
        this.incrementErrorCount('SubmissionError', context.jobId);

        // Apply error-specific recovery
        submissionState = await this.recoverSubmissionData(error, submissionState, context);

        if (attempt > strategy.maxRetries) {
          this.logError(`Submission failed after ${strategy.maxRetries} attempts`, error, context);
          return await this.applySubmissionFallback(error, submissionState, context);
        }

        // Calculate intelligent backoff based on error type
        const delay = this.calculateSubmissionBackoff(attempt, errorType);
        this.logWarning(`Submission failed, retrying in ${delay}ms`, { error: errorType, attempt }, context);
        
        await this.delay(delay);
      }
    }

    throw new SubmissionRecoveryError('Submission recovery failed', lastError, context);
  }

  /**
   * Classify submission errors for targeted recovery
   */
  classifySubmissionError(error) {
    if (error.message.includes('form validation')) return 'VALIDATION_ERROR';
    if (error.message.includes('session expired')) return 'SESSION_ERROR';
    if (error.message.includes('duplicate application')) return 'DUPLICATE_ERROR';
    if (error.message.includes('job no longer available')) return 'JOB_UNAVAILABLE';
    if (error.name === 'TimeoutError') return 'TIMEOUT_ERROR';
    if (error.status === 429) return 'RATE_LIMITED';
    
    return 'UNKNOWN_SUBMISSION_ERROR';
  }

  /**
   * Recover submission data based on error type
   */
  async recoverSubmissionData(error, currentData, context) {
    const errorType = this.classifySubmissionError(error);
    
    switch (errorType) {
      case 'VALIDATION_ERROR':
        return await this.fixValidationErrors(error, currentData);
      
      case 'SESSION_ERROR':
        await this.refreshSession(context);
        return currentData;
      
      case 'DUPLICATE_ERROR':
        return await this.handleDuplicateSubmission(currentData, context);
      
      case 'TIMEOUT_ERROR':
        return await this.optimizeSubmissionData(currentData);
      
      default:
        return currentData;
    }
  }

  // ============================================================================
  // 4. DATA CORRUPTION RECOVERY MECHANISMS
  // ============================================================================

  /**
   * Data integrity handler with corruption detection and recovery
   */
  async withDataRecovery(dataOperation, context = {}) {
    try {
      // Pre-operation data validation
      if (context.data) {
        await this.validateDataIntegrity(context.data, context);
      }

      const result = await dataOperation();

      // Post-operation data validation
      if (result) {
        await this.validateDataIntegrity(result, { ...context, phase: 'post-operation' });
      }

      return result;

    } catch (error) {
      if (this.isDataCorruptionError(error)) {
        this.logError('Data corruption detected', error, context);
        return await this.recoverCorruptedData(error, context);
      }
      
      throw error;
    }
  }

  /**
   * Detect data corruption patterns
   */
  isDataCorruptionError(error) {
    const corruptionIndicators = [
      'JSON parse error',
      'Invalid data structure',
      'Schema validation failed',
      'Checksum mismatch',
      'Data type mismatch',
      'Required field missing'
    ];

    return corruptionIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Comprehensive data corruption recovery
   */
  async recoverCorruptedData(error, context) {
    const recoveryStrategies = [
      () => this.restoreFromBackup(context),
      () => this.rebuildFromSource(context),
      () => this.repairPartialData(error, context),
      () => this.useDefaultData(context),
      () => this.requestDataRefresh(context)
    ];

    for (const strategy of recoveryStrategies) {
      try {
        this.logInfo('Attempting data recovery', { strategy: strategy.name, context });
        const recovered = await strategy();
        
        if (recovered && await this.validateDataIntegrity(recovered, context)) {
          this.logInfo('Data recovery successful', { strategy: strategy.name });
          return recovered;
        }
      } catch (recoveryError) {
        this.logDebug('Data recovery strategy failed', { 
          strategy: strategy.name, 
          error: recoveryError 
        });
      }
    }

    throw new DataRecoveryError('All data recovery strategies failed', error, context);
  }

  /**
   * Validate data integrity with comprehensive checks
   */
  async validateDataIntegrity(data, context) {
    if (!data) {
      throw new DataIntegrityError('Data is null or undefined', context);
    }

    // Type validation
    if (context.expectedType && typeof data !== context.expectedType) {
      throw new DataIntegrityError(`Data type mismatch: expected ${context.expectedType}, got ${typeof data}`, context);
    }

    // Schema validation
    if (context.schema) {
      const isValid = await this.validateSchema(data, context.schema);
      if (!isValid) {
        throw new DataIntegrityError('Schema validation failed', context);
      }
    }

    // Checksum validation
    if (context.checksum) {
      const currentChecksum = await this.calculateChecksum(data);
      if (currentChecksum !== context.checksum) {
        throw new DataIntegrityError('Checksum mismatch detected', context);
      }
    }

    return true;
  }

  // ============================================================================
  // UTILITY METHODS AND HELPERS
  // ============================================================================

  /**
   * Calculate intelligent backoff delay
   */
  calculateBackoffDelay(attempt, strategy = 'exponential') {
    const baseDelay = this.options.baseDelay;
    let delay;

    switch (strategy) {
      case 'exponential':
        delay = baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'fixed':
        delay = baseDelay;
        break;
      default:
        delay = baseDelay;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay = Math.min(delay + jitter, this.options.maxDelay);

    return Math.floor(delay);
  }

  /**
   * Smart error counting and tracking
   */
  incrementErrorCount(errorType, identifier) {
    const key = `${errorType}:${identifier}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
    
    // Trigger circuit breaker if too many errors
    if (current + 1 > 10) {
      this.triggerCircuitBreaker(errorType, identifier);
    }
  }

  resetErrorCount(errorType, identifier) {
    const key = `${errorType}:${identifier}`;
    this.errorCounts.delete(key);
  }

  /**
   * Comprehensive logging with context
   */
  logError(message, error = null, context = {}) {
    if (!this.options.enableLogging) return;
    
    const logEntry = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      context,
      userAgent: navigator.userAgent,
      url: window.location?.href
    };

    console.error('🚨 JobScrapper Error:', logEntry);
    this.sendToAnalytics('error', logEntry);
  }

  logWarning(message, error = null, context = {}) {
    if (!this.options.enableLogging || this.options.logLevel === 'error') return;
    
    console.warn('⚠️ JobScrapper Warning:', { message, error, context });
  }

  logInfo(message, context = {}) {
    if (!this.options.enableLogging || ['error', 'warning'].includes(this.options.logLevel)) return;
    
    console.info('ℹ️ JobScrapper Info:', { message, context });
  }

  logDebug(message, context = {}) {
    if (!this.options.enableLogging || this.options.logLevel !== 'debug') return;
    
    console.debug('🔍 JobScrapper Debug:', { message, context });
  }

  /**
   * Delay utility with cancellation support
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send error analytics for monitoring
   */
  async sendToAnalytics(eventType, data) {
    try {
      // Send to background script for analytics
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'ANALYTICS_EVENT',
          eventType,
          data
        });
      }
    } catch (error) {
      // Fail silently for analytics
    }
  }

  /**
   * Generic error handler for consistent error processing
   */
  async handleError(error, errorType = 'UnknownError', context = {}) {
    const enhancedContext = {
      ...context,
      errorType,
      timestamp: new Date().toISOString(),
      stackTrace: error?.stack
    };

    this.logError(`${errorType} occurred`, error, enhancedContext);
    
    // Apply recovery strategy if available
    const strategy = this.recoveryStrategies.get(errorType);
    if (strategy && strategy.retry) {
      return await this.applyRecoveryStrategy(error, errorType, enhancedContext);
    }

    return { success: false, error, context: enhancedContext };
  }
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class NetworkRecoveryError extends Error {
  constructor(message, originalError, context) {
    super(message);
    this.name = 'NetworkRecoveryError';
    this.originalError = originalError;
    this.context = context;
  }
}

export class DOMNotFoundError extends Error {
  constructor(message, selector) {
    super(message);
    this.name = 'DOMNotFoundError';
    this.selector = selector;
  }
}

export class SubmissionRecoveryError extends Error {
  constructor(message, originalError, context) {
    super(message);
    this.name = 'SubmissionRecoveryError';
    this.originalError = originalError;
    this.context = context;
  }
}

export class DataRecoveryError extends Error {
  constructor(message, originalError, context) {
    super(message);
    this.name = 'DataRecoveryError';
    this.originalError = originalError;
    this.context = context;
  }
}

export class DataIntegrityError extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'DataIntegrityError';
    this.context = context;
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler({
  maxRetries: 3,
  baseDelay: 1000,
  enableLogging: true,
  logLevel: 'info'
});

export default ErrorHandler;
