// Multi-Step Job Application State Machine
// Clean state management for complex application flows like LinkedIn Easy Apply

import { AutoFillSystem } from './autoFillSystem.js';
import { StealthUtils } from './stealthUtils.js';

/**
 * Application State Machine
 * Manages multi-step job application flows with error recovery
 */
class ApplicationStateMachine {
  constructor(options = {}) {
    this.config = {
      maxRetries: options.maxRetries || 3,
      stepTimeout: options.stepTimeout || 30000,
      enableStealth: options.enableStealth !== false,
      autoAdvance: options.autoAdvance !== false,
      debugMode: options.debugMode || false
    };

    // State machine properties
    this.currentState = 'INITIALIZED';
    this.currentStep = 0;
    this.totalSteps = 0;
    this.stepHistory = [];
    this.errorCount = 0;
    this.retryCount = 0;
    this.context = {};

    // State definitions
    this.states = new Map([
      ['INITIALIZED', new InitializedState()],
      ['DETECTING_STEPS', new DetectingStepsState()],
      ['FILLING_STEP', new FillingStepState()],
      ['NAVIGATING', new NavigatingState()],
      ['VALIDATING', new ValidatingState()],
      ['COMPLETING', new CompletingState()],
      ['ERROR_RECOVERY', new ErrorRecoveryState()],
      ['COMPLETED', new CompletedState()],
      ['FAILED', new FailedState()]
    ]);

    // Initialize auto-fill system
    this.autoFill = new AutoFillSystem({
      enableStealth: this.config.enableStealth,
      validateFields: true
    });

    // Step detector and navigator
    this.stepDetector = new StepDetector();
    this.stepNavigator = new StepNavigator();
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Start the application process
   */
  async startApplication(userData, applicationConfig = {}) {
    this.log('🚀 Starting multi-step application process');
    
    try {
      this.context = {
        userData,
        applicationConfig,
        startTime: Date.now(),
        errors: [],
        stepData: new Map()
      };

      // Begin state machine execution
      await this.transition('DETECTING_STEPS');
      
      // Main execution loop
      while (!this.isTerminalState()) {
        await this.executeCurrentState();
      }

      return this.getResult();

    } catch (error) {
      this.log('❌ Application process failed:', error);
      await this.transition('FAILED', { error });
      return this.getResult();
    }
  }

  /**
   * Execute current state logic
   */
  async executeCurrentState() {
    const state = this.states.get(this.currentState);
    if (!state) {
      throw new Error(`Unknown state: ${this.currentState}`);
    }

    this.log(`🔄 Executing state: ${this.currentState}`);
    
    try {
      const result = await state.execute(this);
      await this.handleStateResult(result);
    } catch (error) {
      this.log(`⚠️ State execution error in ${this.currentState}:`, error);
      await this.handleError(error);
    }
  }

  /**
   * Handle state execution result
   */
  async handleStateResult(result) {
    if (result.nextState) {
      await this.transition(result.nextState, result.data);
    }

    if (result.updateContext) {
      Object.assign(this.context, result.updateContext);
    }

    if (result.progress) {
      this.progressTracker.updateProgress(result.progress);
    }
  }

  /**
   * Transition to new state
   */
  async transition(newState, data = {}) {
    const oldState = this.currentState;
    
    if (!this.states.has(newState)) {
      throw new Error(`Invalid state transition: ${oldState} -> ${newState}`);
    }

    this.currentState = newState;
    this.stepHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      data
    });

    this.log(`🔄 State transition: ${oldState} -> ${newState}`);

    // Execute state entry logic
    const state = this.states.get(newState);
    if (state.onEnter) {
      await state.onEnter(this, data);
    }
  }

  /**
   * Handle errors with recovery logic
   */
  async handleError(error) {
    this.errorCount++;
    this.context.errors.push({
      error: error.message,
      state: this.currentState,
      step: this.currentStep,
      timestamp: Date.now()
    });

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.log(`🔄 Attempting recovery (${this.retryCount}/${this.config.maxRetries})`);
      await this.transition('ERROR_RECOVERY', { error, retryCount: this.retryCount });
    } else {
      this.log('❌ Max retries exceeded, failing application');
      await this.transition('FAILED', { error, reason: 'max_retries_exceeded' });
    }
  }

  /**
   * Check if current state is terminal
   */
  isTerminalState() {
    return ['COMPLETED', 'FAILED'].includes(this.currentState);
  }

  /**
   * Get final result
   */
  getResult() {
    return {
      success: this.currentState === 'COMPLETED',
      state: this.currentState,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      progress: this.progressTracker.getProgress(),
      duration: Date.now() - this.context.startTime,
      errors: this.context.errors,
      stepHistory: this.stepHistory,
      context: this.context
    };
  }

  /**
   * Debug logging
   */
  log(message, ...args) {
    if (this.config.debugMode) {
      console.log(`[StateMachine] ${message}`, ...args);
    }
  }
}

/**
 * Base State Class
 */
class BaseState {
  async execute(machine) {
    throw new Error('State must implement execute method');
  }

  async onEnter(machine, data) {
    // Optional entry logic
  }

  async onExit(machine) {
    // Optional exit logic
  }
}

/**
 * Initialized State - Starting point
 */
class InitializedState extends BaseState {
  async execute(machine) {
    machine.log('📋 Initializing application process');
    
    return {
      nextState: 'DETECTING_STEPS',
      updateContext: {
        initialized: true,
        initTime: Date.now()
      }
    };
  }
}

/**
 * Detecting Steps State - Analyze application flow
 */
class DetectingStepsState extends BaseState {
  async execute(machine) {
    machine.log('🔍 Detecting application steps');

    // Detect application flow structure
    const stepInfo = await machine.stepDetector.detectSteps();
    
    machine.totalSteps = stepInfo.totalSteps;
    machine.currentStep = stepInfo.currentStep;

    return {
      nextState: stepInfo.totalSteps > 0 ? 'FILLING_STEP' : 'FAILED',
      updateContext: {
        stepInfo,
        detectedAt: Date.now()
      },
      progress: {
        phase: 'detection',
        completed: true
      }
    };
  }
}

/**
 * Filling Step State - Fill current step form
 */
class FillingStepState extends BaseState {
  async execute(machine) {
    machine.log(`📝 Filling step ${machine.currentStep + 1}/${machine.totalSteps}`);

    // Get current step context
    const stepContext = await machine.stepDetector.getCurrentStepContext();
    
    // Fill current step
    const fillResult = await machine.autoFill.autoFill(
      machine.context.userData,
      {
        scope: stepContext.scope,
        skipFilledFields: true,
        validateFields: true
      }
    );

    // Store step data
    machine.context.stepData.set(machine.currentStep, {
      stepContext,
      fillResult,
      timestamp: Date.now()
    });

    // Determine next action
    const canAdvance = await this.canAdvanceToNext(machine, fillResult);
    
    return {
      nextState: canAdvance ? 'VALIDATING' : 'ERROR_RECOVERY',
      updateContext: {
        lastFillResult: fillResult
      },
      progress: {
        phase: 'filling',
        step: machine.currentStep,
        totalSteps: machine.totalSteps
      }
    };
  }

  async canAdvanceToNext(machine, fillResult) {
    // Check if required fields were filled
    const requiredFieldsFilled = fillResult.failed.length === 0;
    
    // Check if step is valid
    const stepValid = await machine.stepDetector.validateCurrentStep();
    
    return requiredFieldsFilled && stepValid;
  }
}

/**
 * Validating State - Validate current step
 */
class ValidatingState extends BaseState {
  async execute(machine) {
    machine.log('✅ Validating current step');

    const validation = await machine.stepDetector.validateCurrentStep();
    
    if (validation.valid) {
      // Check if this is the last step
      const isLastStep = machine.currentStep >= machine.totalSteps - 1;
      
      return {
        nextState: isLastStep ? 'COMPLETING' : 'NAVIGATING',
        updateContext: {
          stepValidation: validation
        },
        progress: {
          phase: 'validation',
          step: machine.currentStep,
          valid: true
        }
      };
    } else {
      return {
        nextState: 'ERROR_RECOVERY',
        updateContext: {
          validationError: validation.error
        }
      };
    }
  }
}

/**
 * Navigating State - Move to next step
 */
class NavigatingState extends BaseState {
  async execute(machine) {
    machine.log(`➡️ Navigating to step ${machine.currentStep + 2}`);

    const navigationResult = await machine.stepNavigator.navigateToNext();
    
    if (navigationResult.success) {
      machine.currentStep++;
      
      // Wait for new step to load
      await machine.stepDetector.waitForStepLoad(machine.currentStep);
      
      return {
        nextState: 'FILLING_STEP',
        updateContext: {
          navigationResult
        },
        progress: {
          phase: 'navigation',
          step: machine.currentStep
        }
      };
    } else {
      return {
        nextState: 'ERROR_RECOVERY',
        updateContext: {
          navigationError: navigationResult.error
        }
      };
    }
  }
}

/**
 * Completing State - Final submission
 */
class CompletingState extends BaseState {
  async execute(machine) {
    machine.log('🎯 Completing application');

    const completion = await machine.stepNavigator.submitApplication();
    
    if (completion.success) {
      return {
        nextState: 'COMPLETED',
        updateContext: {
          completion,
          completedAt: Date.now()
        },
        progress: {
          phase: 'completion',
          completed: true
        }
      };
    } else {
      return {
        nextState: 'ERROR_RECOVERY',
        updateContext: {
          completionError: completion.error
        }
      };
    }
  }
}

/**
 * Error Recovery State - Handle errors and retry
 */
class ErrorRecoveryState extends BaseState {
  async execute(machine) {
    machine.log(`🔧 Attempting error recovery (attempt ${machine.retryCount})`);

    // Analyze error type and context
    const errorAnalysis = await this.analyzeError(machine);
    
    // Apply recovery strategy
    const recoveryResult = await this.applyRecoveryStrategy(machine, errorAnalysis);
    
    if (recoveryResult.success) {
      // Reset retry count on successful recovery
      machine.retryCount = 0;
      
      return {
        nextState: recoveryResult.resumeState || 'FILLING_STEP',
        updateContext: {
          recoveryApplied: recoveryResult.strategy
        }
      };
    } else {
      // Recovery failed, will trigger retry or failure
      throw new Error(`Recovery failed: ${recoveryResult.error}`);
    }
  }

  async analyzeError(machine) {
    const lastError = machine.context.errors[machine.context.errors.length - 1];
    
    return {
      errorType: this.classifyError(lastError.error),
      context: {
        state: lastError.state,
        step: lastError.step,
        errorMessage: lastError.error
      },
      recoveryOptions: this.getRecoveryOptions(lastError)
    };
  }

  classifyError(errorMessage) {
    const errorTypes = {
      'NETWORK_ERROR': /network|timeout|connection/i,
      'DOM_ERROR': /element|selector|not found/i,
      'VALIDATION_ERROR': /validation|invalid|required/i,
      'NAVIGATION_ERROR': /navigation|button|next/i,
      'FORM_ERROR': /form|input|field/i
    };

    for (const [type, pattern] of Object.entries(errorTypes)) {
      if (pattern.test(errorMessage)) {
        return type;
      }
    }

    return 'UNKNOWN_ERROR';
  }

  getRecoveryOptions(error) {
    const strategies = {
      'NETWORK_ERROR': ['wait_and_retry', 'reload_page'],
      'DOM_ERROR': ['wait_for_element', 'refresh_detection'],
      'VALIDATION_ERROR': ['correct_data', 'skip_validation'],
      'NAVIGATION_ERROR': ['find_alternate_button', 'manual_navigation'],
      'FORM_ERROR': ['retry_fill', 'use_direct_fill']
    };

    return strategies[this.classifyError(error.error)] || ['generic_retry'];
  }

  async applyRecoveryStrategy(machine, analysis) {
    const strategy = analysis.recoveryOptions[0]; // Use first available strategy
    
    machine.log(`🔧 Applying recovery strategy: ${strategy}`);

    switch (strategy) {
      case 'wait_and_retry':
        await StealthUtils.actionDelay();
        return { success: true, strategy };

      case 'refresh_detection':
        await machine.stepDetector.refreshDetection();
        return { success: true, strategy };

      case 'retry_fill':
        return { success: true, strategy, resumeState: 'FILLING_STEP' };

      case 'use_direct_fill':
        // Switch to direct fill mode temporarily
        machine.autoFill.config.enableStealth = false;
        return { success: true, strategy, resumeState: 'FILLING_STEP' };

      default:
        return { success: false, error: `Unknown recovery strategy: ${strategy}` };
    }
  }
}

/**
 * Completed State - Success terminal state
 */
class CompletedState extends BaseState {
  async onEnter(machine, data) {
    machine.log('🎉 Application completed successfully');
    machine.progressTracker.markComplete();
  }

  async execute(machine) {
    // Terminal state - no execution needed
    return {};
  }
}

/**
 * Failed State - Failure terminal state  
 */
class FailedState extends BaseState {
  async onEnter(machine, data) {
    machine.log('❌ Application failed');
    machine.progressTracker.markFailed(data.error);
  }

  async execute(machine) {
    // Terminal state - no execution needed
    return {};
  }
}

/**
 * Step Detection and Analysis
 */
class StepDetector {
  constructor() {
    this.stepSelectors = {
      linkedin: {
        modal: '.jobs-easy-apply-modal',
        steps: '.jobs-easy-apply-form-section',
        currentStep: '[data-easy-apply-form-element]',
        progressBar: '.jobs-easy-apply-form-progress',
        buttons: {
          continue: '[data-control-name="continue_unify"]',
          submit: '[data-control-name="submit_unify"]',
          review: '[data-control-name="review_unify"]'
        }
      },
      indeed: {
        container: '.ia-ApplyForm',
        steps: '.ia-ApplyForm-section',
        currentStep: '.ia-ApplyForm-section:not([style*="display: none"])',
        buttons: {
          continue: '.ia-continueButton',
          submit: '.ia-submitButton'
        }
      },
      generic: {
        container: 'form[class*="apply"], form[id*="apply"]',
        steps: '.step, .form-step, [class*="step"]',
        buttons: {
          continue: 'button[type="button"]:contains("Next"), button:contains("Continue")',
          submit: 'button[type="submit"], input[type="submit"]'
        }
      }
    };

    this.currentPlatform = this.detectPlatform();
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('linkedin')) return 'linkedin';
    if (hostname.includes('indeed')) return 'indeed';
    return 'generic';
  }

  async detectSteps() {
    const selectors = this.stepSelectors[this.currentPlatform];
    
    // Wait for container to load
    await this.waitForElement(selectors.container || selectors.modal);
    
    const steps = document.querySelectorAll(selectors.steps);
    const currentStepIndex = this.getCurrentStepIndex();
    
    return {
      totalSteps: steps.length || this.estimateStepsFromButtons(),
      currentStep: currentStepIndex,
      platform: this.currentPlatform,
      detectionMethod: steps.length > 0 ? 'explicit_steps' : 'button_analysis'
    };
  }

  getCurrentStepIndex() {
    const selectors = this.stepSelectors[this.currentPlatform];
    
    if (selectors.currentStep) {
      const currentSteps = document.querySelectorAll(selectors.currentStep);
      // Find the visible/active step
      for (let i = 0; i < currentSteps.length; i++) {
        const step = currentSteps[i];
        if (this.isElementVisible(step)) {
          return i;
        }
      }
    }
    
    return 0; // Default to first step
  }

  estimateStepsFromButtons() {
    const selectors = this.stepSelectors[this.currentPlatform];
    
    // If we see continue button, assume multi-step
    if (document.querySelector(selectors.buttons.continue)) {
      return 3; // Conservative estimate
    }
    
    // If only submit button, single step
    if (document.querySelector(selectors.buttons.submit)) {
      return 1;
    }
    
    return 1; // Default assumption
  }

  async getCurrentStepContext() {
    const selectors = this.stepSelectors[this.currentPlatform];
    
    // Find the active form section
    const activeStep = document.querySelector(selectors.currentStep) || 
                      document.querySelector(selectors.container);
    
    return {
      scope: activeStep,
      platform: this.currentPlatform,
      stepIndex: this.getCurrentStepIndex(),
      hasNextButton: !!document.querySelector(selectors.buttons.continue),
      hasSubmitButton: !!document.querySelector(selectors.buttons.submit)
    };
  }

  async validateCurrentStep() {
    // Check if required fields are filled
    const requiredFields = document.querySelectorAll('input[required], textarea[required], select[required]');
    
    for (const field of requiredFields) {
      if (!field.value || field.value.trim() === '') {
        return {
          valid: false,
          error: `Required field ${field.name || field.id || 'unknown'} is empty`
        };
      }
    }

    // Check for validation errors
    const invalidFields = document.querySelectorAll('input:invalid, textarea:invalid, select:invalid');
    if (invalidFields.length > 0) {
      return {
        valid: false,
        error: `${invalidFields.length} field(s) have validation errors`
      };
    }

    return { valid: true };
  }

  async waitForStepLoad(stepIndex) {
    // Wait for new step content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for any loading indicators to disappear
    await this.waitForLoadingComplete();
  }

  async waitForLoadingComplete() {
    const loadingSelectors = [
      '.loading', '.spinner', '[data-loading]',
      '.jobs-easy-apply-form-loader'
    ];
    
    for (const selector of loadingSelectors) {
      const loadingElement = document.querySelector(selector);
      if (loadingElement && this.isElementVisible(loadingElement)) {
        await this.waitForElementHidden(selector);
      }
    }
  }

  async refreshDetection() {
    // Re-analyze the current step structure
    this.currentPlatform = this.detectPlatform();
    return await this.detectSteps();
  }

  // Utility methods
  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) return resolve(element);

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async waitForElementHidden(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const checkHidden = () => {
        const element = document.querySelector(selector);
        if (!element || !this.isElementVisible(element)) {
          resolve();
        } else {
          setTimeout(checkHidden, 100);
        }
      };
      
      setTimeout(() => resolve(), timeout); // Timeout fallback
      checkHidden();
    });
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none';
  }
}

/**
 * Step Navigation Handler
 */
class StepNavigator {
  constructor() {
    this.platformSelectors = {
      linkedin: {
        continue: '[data-control-name="continue_unify"]',
        submit: '[data-control-name="submit_unify"]',
        review: '[data-control-name="review_unify"]',
        back: '[data-control-name="back_unify"]'
      },
      indeed: {
        continue: '.ia-continueButton',
        submit: '.ia-submitButton',
        back: '.ia-backButton'
      },
      generic: {
        continue: 'button:contains("Next"), button:contains("Continue")',
        submit: 'button[type="submit"], input[type="submit"]',
        back: 'button:contains("Back"), button:contains("Previous")'
      }
    };
  }

  async navigateToNext() {
    const platform = this.detectPlatform();
    const selectors = this.platformSelectors[platform];
    
    // Look for continue button first
    const continueButton = document.querySelector(selectors.continue);
    if (continueButton && this.isElementVisible(continueButton)) {
      await this.clickButton(continueButton);
      return { success: true, action: 'continue', button: 'continue' };
    }

    // Look for review button (LinkedIn specific)
    if (platform === 'linkedin') {
      const reviewButton = document.querySelector(selectors.review);
      if (reviewButton && this.isElementVisible(reviewButton)) {
        await this.clickButton(reviewButton);
        return { success: true, action: 'review', button: 'review' };
      }
    }

    return { success: false, error: 'No navigation button found' };
  }

  async submitApplication() {
    const platform = this.detectPlatform();
    const selectors = this.platformSelectors[platform];
    
    const submitButton = document.querySelector(selectors.submit);
    if (submitButton && this.isElementVisible(submitButton)) {
      await this.clickButton(submitButton);
      
      // Wait for submission to complete
      await this.waitForSubmissionComplete();
      
      return { success: true, action: 'submit', submittedAt: Date.now() };
    }

    return { success: false, error: 'No submit button found' };
  }

  async clickButton(button) {
    // Scroll to button if needed
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click with slight delay
    button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async waitForSubmissionComplete() {
    // Wait for success indicators or page change
    const successSelectors = [
      '.success', '.confirmation', '.thank-you',
      '[data-test="application-success"]'
    ];

    try {
      await Promise.race([
        this.waitForAnyElement(successSelectors),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
      ]);
    } catch (error) {
      // Submission may still be successful even without success indicator
    }
  }

  async waitForAnyElement(selectors, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const checkElements = () => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && this.isElementVisible(element)) {
            resolve(element);
            return;
          }
        }
      };

      checkElements();

      const observer = new MutationObserver(checkElements);
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('No success element found'));
      }, timeout);
    });
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('linkedin')) return 'linkedin';
    if (hostname.includes('indeed')) return 'indeed';
    return 'generic';
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none';
  }
}

/**
 * Progress Tracking
 */
class ProgressTracker {
  constructor() {
    this.progress = {
      phase: 'initialized',
      step: 0,
      totalSteps: 0,
      completed: false,
      failed: false,
      phases: []
    };
  }

  updateProgress(update) {
    Object.assign(this.progress, update);
    
    if (update.phase) {
      this.progress.phases.push({
        phase: update.phase,
        timestamp: Date.now(),
        ...update
      });
    }
  }

  getProgress() {
    return {
      ...this.progress,
      percentage: this.calculatePercentage(),
      currentPhase: this.getCurrentPhase()
    };
  }

  calculatePercentage() {
    if (this.progress.totalSteps === 0) return 0;
    return Math.round((this.progress.step / this.progress.totalSteps) * 100);
  }

  getCurrentPhase() {
    return this.progress.phases[this.progress.phases.length - 1] || null;
  }

  markComplete() {
    this.progress.completed = true;
    this.progress.phase = 'completed';
    this.updateProgress({ phase: 'completed', completed: true });
  }

  markFailed(error) {
    this.progress.failed = true;
    this.progress.phase = 'failed';
    this.updateProgress({ phase: 'failed', failed: true, error });
  }
}

export { 
  ApplicationStateMachine, 
  StepDetector, 
  StepNavigator, 
  ProgressTracker 
};
