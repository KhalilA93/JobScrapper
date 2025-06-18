// Error Handling Integration for Content Scripts
// Implements error recovery patterns for job scraping and DOM operations

import { errorHandler } from './errorHandler.js';

/**
 * Content Script Error Handler
 * Specialized error handling for DOM operations and job scraping
 */
export class ContentScriptErrorHandler {
  constructor() {
    this.domObserver = null;
    this.retryQueue = [];
    this.failedOperations = new Map();
  }

  /**
   * Robust job data extraction with error recovery
   */
  async extractJobDataSafely(extractor, context = {}) {
    return await errorHandler.withDOMRecovery(async () => {
      try {
        return await extractor();
      } catch (error) {
        if (error.name === 'DOMException') {
          throw new DOMNotFoundError('Job data extraction failed', context.selector);
        }
        throw error;
      }
    }, context);
  }

  /**
   * Safe form filling with graceful degradation
   */
  async fillFormSafely(formFiller, formData, context = {}) {
    return await errorHandler.withDOMRecovery(async () => {
      // Validate form exists
      const form = document.querySelector(context.formSelector);
      if (!form) {
        throw new DOMNotFoundError('Form not found', context.formSelector);
      }

      // Fill form with error recovery
      const result = await formFiller(form, formData);
      
      // Validate form was filled correctly
      if (!this.validateFormFilled(form, formData)) {
        throw new Error('Form validation failed after filling');
      }

      return result;
    }, {
      ...context,
      operation: 'form_fill',
      selector: context.formSelector
    });
  }

  /**
   * Safe button clicking with retry logic
   */
  async clickButtonSafely(buttonSelector, context = {}) {
    return await errorHandler.withDOMRecovery(async () => {
      const button = document.querySelector(buttonSelector);
      if (!button) {
        throw new DOMNotFoundError('Button not found', buttonSelector);
      }

      // Check if button is clickable
      if (!this.isElementClickable(button)) {
        throw new Error('Button is not clickable');
      }

      // Simulate human-like click
      await this.simulateHumanClick(button);
      
      // Verify click was successful
      return await this.verifyClickAction(button, context);
    }, {
      ...context,
      selector: buttonSelector,
      operation: 'button_click'
    });
  }

  /**
   * Monitor DOM changes for error recovery
   */
  setupDOMMonitoring(callback) {
    if (this.domObserver) {
      this.domObserver.disconnect();
    }

    this.domObserver = new MutationObserver((mutations) => {
      try {
        callback(mutations);
      } catch (error) {
        errorHandler.logError('DOM mutation callback failed', error, {
          mutations: mutations.length
        });
      }
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'disabled']
    });
  }

  /**
   * Validate form was filled correctly
   */
  validateFormFilled(form, expectedData) {
    try {
      const inputs = form.querySelectorAll('input, select, textarea');
      let filledCount = 0;
      
      for (const input of inputs) {
        if (input.value && input.value.trim()) {
          filledCount++;
        }
      }

      return filledCount > 0;
    } catch (error) {
      errorHandler.logWarning('Form validation failed', error);
      return false;
    }
  }

  /**
   * Check if element is clickable
   */
  isElementClickable(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      !element.disabled
    );
  }

  /**
   * Simulate human-like click behavior
   */
  async simulateHumanClick(element) {
    // Mouse over first
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Click with realistic delay
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  /**
   * Verify click action was successful
   */
  async verifyClickAction(button, context) {
    // Wait for potential page changes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for common success indicators
    const successIndicators = [
      () => document.querySelector('.success-message'),
      () => document.querySelector('.confirmation'),
      () => window.location.href !== context.originalUrl,
      () => button.classList.contains('clicked') || button.disabled
    ];

    for (const indicator of successIndicators) {
      try {
        if (indicator()) {
          return { success: true, verified: true };
        }
      } catch (error) {
        // Continue checking other indicators
      }
    }

    return { success: true, verified: false };
  }
}

/**
 * Background Script Error Handler
 * Specialized error handling for background operations and API calls
 */
export class BackgroundScriptErrorHandler {
  constructor() {
    this.apiCallQueue = [];
    this.rateLimitTracker = new Map();
  }

  /**
   * API call with comprehensive error recovery
   */
  async apiCallSafely(apiFunction, context = {}) {
    return await errorHandler.withNetworkRecovery(async () => {
      // Check rate limiting
      if (this.isRateLimited(context.endpoint)) {
        throw new Error('Rate limited');
      }

      const result = await apiFunction();
      
      // Track successful call
      this.trackApiCall(context.endpoint, true);
      
      return result;
    }, context);
  }

  /**
   * Batch operation with error isolation
   */
  async processBatchSafely(items, processor, context = {}) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await processor(items[i], i);
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        errorHandler.logWarning(`Batch item ${i} failed`, error, context);
        errors.push({ index: i, error });
        results.push({ index: i, success: false, error });
        
        // Continue processing other items
      }
    }

    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length
    };
  }

  /**
   * Storage operations with data integrity
   */
  async storageOperationSafely(operation, data, context = {}) {
    return await errorHandler.withDataRecovery(async () => {
      return await operation(data);
    }, { ...context, data });
  }

  /**
   * Check if endpoint is rate limited
   */
  isRateLimited(endpoint) {
    const tracker = this.rateLimitTracker.get(endpoint);
    if (!tracker) return false;
    
    const now = Date.now();
    return now < tracker.resetTime;
  }

  /**
   * Track API call for rate limiting
   */
  trackApiCall(endpoint, success) {
    const tracker = this.rateLimitTracker.get(endpoint) || {
      calls: 0,
      errors: 0,
      lastCall: 0,
      resetTime: 0
    };

    tracker.calls++;
    tracker.lastCall = Date.now();
    
    if (!success) {
      tracker.errors++;
      // Implement progressive backoff
      if (tracker.errors > 3) {
        tracker.resetTime = Date.now() + (tracker.errors * 60000); // 1 min per error
      }
    } else {
      tracker.errors = Math.max(0, tracker.errors - 1); // Reduce error count on success
    }

    this.rateLimitTracker.set(endpoint, tracker);
  }
}

/**
 * Application State Error Handler
 * Manages application state recovery and persistence
 */
export class ApplicationStateErrorHandler {
  constructor() {
    this.stateBackups = new Map();
    this.stateValidators = new Map();
  }

  /**
   * Safe state transitions with rollback capability
   */
  async transitionStateSafely(currentState, newState, transitionFn, context = {}) {
    // Backup current state
    const backup = this.createStateBackup(currentState, context);
    
    try {
      // Validate transition
      await this.validateStateTransition(currentState, newState, context);
      
      // Perform transition
      const result = await transitionFn(currentState, newState);
      
      // Validate result state
      await this.validateState(result, context);
      
      return result;
    } catch (error) {
      errorHandler.logError('State transition failed, rolling back', error, context);
      
      // Rollback to previous state
      return await this.rollbackState(backup, context);
    }
  }

  /**
   * Create state backup for rollback
   */
  createStateBackup(state, context) {
    const backup = {
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
      context
    };
    
    this.stateBackups.set(context.id || 'default', backup);
    return backup;
  }

  /**
   * Validate state transition is valid
   */
  async validateStateTransition(fromState, toState, context) {
    const validator = this.stateValidators.get(context.stateType);
    if (validator) {
      const isValid = await validator(fromState, toState);
      if (!isValid) {
        throw new Error(`Invalid state transition from ${fromState} to ${toState}`);
      }
    }
  }

  /**
   * Rollback to previous state
   */
  async rollbackState(backup, context) {
    try {
      errorHandler.logInfo('Rolling back state', context);
      return backup.state;
    } catch (error) {
      errorHandler.logError('State rollback failed', error, context);
      throw new Error('Critical state recovery failure');
    }
  }
}

// Export instances
export const contentScriptErrorHandler = new ContentScriptErrorHandler();
export const backgroundScriptErrorHandler = new BackgroundScriptErrorHandler();
export const applicationStateErrorHandler = new ApplicationStateErrorHandler();
