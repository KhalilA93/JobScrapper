// JobScrapper Content Script Communication Example
// Demonstrates integration with background service worker

import { MessageHelper, MessageBuilder, MessageTypes } from '../utils/messageProtocol.js';
import { ApplicationStateMachine } from '../utils/applicationStateMachine.js';
import { AutoFillSystem } from '../utils/autoFillSystem.js';
import { contentNotify } from '../utils/notificationIntegration.js';
import { contentScriptErrorHandler } from '../utils/errorHandlingIntegration.js';
import { domCache, memoryManager, performanceMonitor } from '../utils/performanceOptimizer.js';

/**
 * Content Script Integration with Background Service Worker
 * Shows communication patterns and job processing with comprehensive error handling and performance optimization
 */
class ContentScriptManager {
  constructor() {
    this.isProcessing = false;
    this.currentApplication = null;
    this.applicationStartTime = null;
    this.performanceTimer = null;
    this.initialize();
  }

  initialize() {
    this.setupMessageListeners();
    this.detectCurrentJob();
    this.setupErrorHandling();
    this.setupPerformanceOptimization();
    console.log('📱 Content script communication initialized with performance optimization');
  }

  /**
   * Setup performance optimization for content script operations
   */
  setupPerformanceOptimization() {
    // Register content script for memory management
    memoryManager.registerObject(this, (obj) => {
      obj.cleanup();
    });

    // Setup DOM cache for efficient querying
    this.domQueryCache = domCache;

    // Monitor performance metrics
    performanceMonitor.recordMetric('performance', 'content_script_loaded', 1, {
      url: window.location.href,
      platform: this.detectPlatform()
    });

    // Setup periodic memory monitoring
    this.memoryCheckInterval = memoryManager.setInterval(() => {
      const memStats = memoryManager.checkMemoryUsage();
      if (memStats && memStats.ratio > 0.7) {
        console.warn('High memory usage in content script:', memStats);
        this.optimizeMemoryUsage();
      }
    }, 30000);
  }

  /**
   * Setup error handling for content script operations
   */
  setupErrorHandling() {
    // Monitor DOM changes for error recovery
    contentScriptErrorHandler.setupDOMMonitoring((mutations) => {
      // Handle dynamic content changes that might affect job processing
      if (this.isProcessing && this.currentApplication) {
        this.handleDOMChanges(mutations);
      }
      
      // Invalidate DOM cache for changed elements
      if (mutations.length > 10) {
        this.domQueryCache.clear();
        performanceMonitor.recordMetric('cache', 'dom_cache_cleared', 1, {
          mutations: mutations.length
        });
      }
    });
  }

  // ============================================================================
  // MESSAGE LISTENERS WITH ERROR HANDLING
  // ============================================================================

  setupMessageListeners() {
    // Listen for job site detection from background
    MessageHelper.onMessage(MessageTypes.JOB_SITE_DETECTED, async (data) => {
      try {
        console.log(`🎯 Job site detected: ${data.platform}`);
        await this.onJobSiteDetected(data);
      } catch (error) {
        await contentNotify.error('Job site detection failed', {
          platform: data.platform,
          error: error.message
        });
      }
    });

    // Listen for application start command with error recovery
    MessageHelper.onMessage(MessageTypes.START_APPLICATION, async (data) => {
      try {
        console.log('🚀 Starting application process');
        return await this.startApplicationSafely(data);
      } catch (error) {
        await contentNotify.error('Application start failed', {
          jobId: data.jobId,
          error: error.message
        });
        return { success: false, error: error.message };
      }
    });

    // Listen for job checking requests
    MessageHelper.onMessage(MessageTypes.CHECK_FOR_JOBS, async () => {
      try {
        await this.detectCurrentJobSafely();
      } catch (error) {
        console.warn('Job detection failed:', error);
      }
    });
  }

  // ============================================================================
  // ERROR-SAFE JOB PROCESSING
  // ============================================================================

  /**
   * Safe application start with comprehensive error handling
   */
  async startApplicationSafely(data) {
    return await contentScriptErrorHandler.extractJobDataSafely(async () => {
      this.isProcessing = true;
      this.applicationStartTime = Date.now();
      
      try {
        // Initialize application state machine with error recovery
        const stateMachine = new ApplicationStateMachine({
          jobId: data.jobId,
          platform: data.platform,
          errorHandler: contentScriptErrorHandler
        });

        // Start application process
        const result = await this.processApplicationSteps(stateMachine, data);
        
        // Notify success
        await contentNotify.success('Application submitted successfully', {
          jobId: data.jobId,
          platform: data.platform,
          duration: Date.now() - this.applicationStartTime
        });

        return result;
      } finally {
        this.isProcessing = false;
        this.currentApplication = null;
      }
    }, {
      operation: 'start_application',
      jobId: data.jobId,
      platform: data.platform
    });
  }

  /**
   * Process application steps with error recovery
   */
  async processApplicationSteps(stateMachine, data) {
    const steps = [
      () => this.fillApplicationFormSafely(data),
      () => this.uploadDocumentsSafely(data),
      () => this.submitApplicationSafely(data),
      () => this.verifySubmissionSafely(data)
    ];

    const results = [];
    for (const [index, step] of steps.entries()) {
      try {
        const result = await step();
        results.push({ step: index, success: true, result });
        
        // Update state machine
        await stateMachine.transition(`step_${index}_completed`);
      } catch (error) {
        // Handle step failure with recovery attempt
        const recovery = await this.attemptStepRecovery(step, index, error, data);
        results.push({ step: index, success: recovery.success, error: error.message, recovery });
        
        if (!recovery.success) {
          throw new Error(`Application step ${index} failed: ${error.message}`);
        }
      }
    }

    return { success: true, steps: results };
  }

  /**
   * Safe form filling with error handling
   */
  async fillApplicationFormSafely(data) {
    const timer = performanceMonitor.time('performance', 'form_filling');
    
    try {
      return await contentScriptErrorHandler.fillFormSafely(
        async (form, formData) => {
          const autoFill = new AutoFillSystem({
            errorHandler: contentScriptErrorHandler,
            performanceMonitor: performanceMonitor
          });
          
          // Use optimized field detection
          const fields = await this.detectFormFieldsOptimized(form);
          
          // Fill form with performance tracking
          const result = await autoFill.fillFormOptimized(form, formData, fields, {
            platform: data.platform,
            jobId: data.jobId
          });
          
          // Record form filling metrics
          performanceMonitor.recordMetric('performance', 'form_fields_filled', Object.keys(result).length, {
            platform: data.platform,
            success: result.success
          });
          
          return result;
        },
        data.applicationData,
        {
          formSelector: this.getFormSelector(data.platform),
          platform: data.platform,
          jobId: data.jobId
        }
      );
    } finally {
      timer.end();
    }
  }

  /**
   * Detect form fields using cached queries
   */
  async detectFormFieldsOptimized(form) {
    const commonFields = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="tel"]',
      'textarea',
      'select',
      'input[type="file"]'
    ];
    
    const fieldQueries = commonFields.map(selector => ({
      name: selector,
      selector,
      context: form,
      multiple: true
    }));
    
    const timer = performanceMonitor.time('performance', 'field_detection');
    const fieldElements = await this.domQueryCache.batchQuery(fieldQueries);
    timer.end();
    
    // Process and categorize fields
    const categorizedFields = {};
    
    for (const [selector, elements] of Object.entries(fieldElements)) {
      if (elements && elements.length > 0) {
        categorizedFields[selector] = elements.map(el => ({
          element: el,
          name: el.name || el.id || el.className,
          type: el.type || el.tagName.toLowerCase(),
          placeholder: el.placeholder,
          required: el.required
        }));
      }
    }
    
    return categorizedFields;
  }

  /**
   * Safe button clicking for form submission
   */
  async submitApplicationSafely(data) {
    const submitSelector = this.getSubmitButtonSelector(data.platform);
    
    return await contentScriptErrorHandler.clickButtonSafely(submitSelector, {
      platform: data.platform,
      jobId: data.jobId,
      operation: 'submit_application',
      originalUrl: window.location.href
    });
  }

  /**
   * Safe job detection with error recovery
   */
  async detectCurrentJobSafely() {
    const timer = performanceMonitor.time('performance', 'job_detection');
    
    try {
      return await contentScriptErrorHandler.extractJobDataSafely(async () => {
        // Use cached DOM queries for better performance
        const jobData = await this.extractJobDataOptimized();
        
        if (jobData) {
          // Cache successful extraction patterns
          this.cacheExtractionPattern(jobData);
          
          // Notify background of found job
          await this.notifyJobDetected(jobData);
        }
        
        return jobData;
      }, {
        operation: 'detect_job',
        url: window.location.href,
        selector: this.getJobSelector(),
        platform: this.detectPlatform()
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Extract job data using optimized DOM queries
   */
  async extractJobDataOptimized() {
    const platform = this.detectPlatform();
    const extractionConfig = this.getExtractionConfig(platform);
    
    // Batch DOM queries for efficiency
    const queries = [
      { name: 'title', selector: extractionConfig.title },
      { name: 'company', selector: extractionConfig.company },
      { name: 'location', selector: extractionConfig.location },
      { name: 'description', selector: extractionConfig.description },
      { name: 'salary', selector: extractionConfig.salary, multiple: true },
      { name: 'requirements', selector: extractionConfig.requirements, multiple: true }
    ];
    
    const timer = performanceMonitor.time('performance', 'batch_dom_query');
    const elements = await this.domQueryCache.batchQuery(queries);
    const queryTime = timer.end();
    
    // Record DOM query performance
    performanceMonitor.recordDOMQuery('batch_extraction', queryTime, false, {
      platform,
      queriesCount: queries.length
    });
    
    // Extract text content efficiently
    const jobData = {
      title: this.extractTextContent(elements.title),
      company: this.extractTextContent(elements.company),
      location: this.extractTextContent(elements.location),
      description: this.extractTextContent(elements.description),
      salary: this.extractSalaryInfo(elements.salary),
      requirements: this.extractRequirements(elements.requirements),
      url: window.location.href,
      platform,
      extractedAt: new Date().toISOString()
    };
    
    // Validate extracted data
    if (!jobData.title && !jobData.company) {
      return null;
    }
    
    return jobData;
  }

  /**
   * Notify background of detected job
   */
  async notifyJobDetected(jobData) {
    // Report job to background service
    await MessageHelper.sendToBackground(
      MessageBuilder.jobDetected(jobData)
    );

    console.log('✅ Job reported to background service:', jobData.title);
  }

  /**
   * Attempt to recover from step failures
   */
  async attemptStepRecovery(failedStep, stepIndex, error, data) {
    const recoveryStrategies = {
      0: () => this.recoverFormFilling(data, error),
      1: () => this.recoverDocumentUpload(data, error),
      2: () => this.recoverSubmission(data, error),
      3: () => this.recoverVerification(data, error)
    };

    const recovery = recoveryStrategies[stepIndex];
    if (recovery) {
      try {
        const result = await recovery();
        await contentNotify.info('Step recovery successful', {
          step: stepIndex,
          jobId: data.jobId
        });
        return { success: true, result };
      } catch (recoveryError) {
        await contentNotify.error('Step recovery failed', {
          step: stepIndex,
          originalError: error.message,
          recoveryError: recoveryError.message
        });
        return { success: false, error: recoveryError };
      }
    }

    return { success: false, error: new Error('No recovery strategy available') };
  }

  // ============================================================================
  // JOB DETECTION & REPORTING
  // ============================================================================

  async detectCurrentJob() {
    if (this.isProcessing) return;

    try {
      const jobData = await this.extractJobData();
      if (!jobData) return;

      // Report job to background service
      await MessageHelper.sendToBackground(
        MessageBuilder.jobDetected(jobData)
      );

      console.log('✅ Job reported to background service:', jobData.title);

    } catch (error) {
      console.error('❌ Job detection failed:', error);
    }
  }

  async extractJobData() {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'linkedin':
        return this.extractLinkedInJob();
      case 'indeed':
        return this.extractIndeedJob();
      case 'glassdoor':
        return this.extractGlassdoorJob();
      default:
        return this.extractGenericJob();
    }
  }

  extractLinkedInJob() {
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
    const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet');
    const descriptionEl = document.querySelector('.job-details-jobs-unified-top-card__job-description');

    if (!titleEl || !companyEl) return null;

    return {
      jobId: this.extractJobId(),
      title: titleEl.textContent?.trim(),
      company: companyEl.textContent?.trim(),
      location: locationEl?.textContent?.trim() || '',
      description: descriptionEl?.textContent?.trim() || '',
      platform: 'linkedin',
      url: window.location.href,
      applyUrl: this.findApplyButton()?.href || '',
      requirements: this.extractRequirements(),
      salary: this.extractSalary(),
      postedDate: this.extractPostedDate()
    };
  }

  // ============================================================================
  // APPLICATION PROCESSING
  // ============================================================================

  async startApplication(data) {
    if (this.isProcessing) {
      throw new Error('Application already in progress');
    }

    this.isProcessing = true;
    this.currentApplication = {
      queueId: data.queueId,
      startTime: Date.now(),
      jobData: data.jobData,
      userData: data.userData
    };

    try {
      // Notify application started
      await contentNotify.applicationStarted({
        jobTitle: data.jobData.title,
        company: data.jobData.company,
        platform: this.currentPlatform,
        url: window.location.href
      });

      console.log('🚀 Starting job application process for:', data.jobData.title);
      
      // Initialize application state machine
      const stateMachine = new ApplicationStateMachine({
        enableStealth: data.settings.enableStealth,
        maxRetries: data.settings.maxRetries,
        debugMode: false
      });

      // Start application process with progress reporting
      const result = await stateMachine.startApplication(
        data.userData,
        {
          platform: data.jobData.platform,
          progressCallback: this.reportProgress.bind(this)
        }
      );

      if (result.success) {
        const processingTime = Date.now() - this.applicationStartTime;
        
        // Notify success
        await contentNotify.applicationCompleted({
          jobTitle: data.jobData.title,
          company: data.jobData.company,
          platform: this.currentPlatform,
          url: window.location.href,
          appliedAt: new Date().toISOString(),
          processingTime,
          automatedApplication: true,
          stepsCompleted: result.currentStep
        });
        
        console.log('✅ Job application completed successfully');
      } else {
        // Notify failure
        await contentNotify.applicationFailed({
          jobTitle: data.jobData.title,
          company: data.jobData.company,
          platform: this.currentPlatform,
          url: window.location.href,
          error: { message: result.errors?.[0] || 'Application process failed' },
          attempts: 1,
          maxAttempts: 3,
          stepsCompleted: result.currentStep,
          failedStep: result.currentStep
        });
        
        console.error('❌ Job application failed:', result.errors?.[0]);
      }
      
      // Report completion
      await this.reportCompletion(result);
      return result;

    } catch (error) {
      // Notify critical error
      await contentNotify.applicationFailed({
        jobTitle: data.jobData.title,
        company: data.jobData.company,
        platform: this.currentPlatform,
        url: window.location.href,
        error: { message: error.message },
        attempts: 1,
        maxAttempts: 3,
        criticalError: true
      });
      
      console.error('❌ Critical error during job application:', error);
      await this.reportError(error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentApplication = null;
    }
  }

  async reportProgress(progressData) {
    if (!this.currentApplication) return;

    await MessageHelper.sendToBackground(
      MessageBuilder.applicationStep(this.currentApplication.queueId, {
        currentStep: progressData.step || 0,
        totalSteps: progressData.totalSteps || 1,
        stepName: progressData.phase || 'processing',
        progress: progressData.percentage || 0,
        fieldsCompleted: progressData.fieldsCompleted || 0,
        fieldsTotal: progressData.fieldsTotal || 0,
        errors: progressData.errors || []
      })
    );
  }

  async reportCompletion(result) {
    if (!this.currentApplication) return;

    const processingTime = Date.now() - this.currentApplication.startTime;

    await MessageHelper.sendToBackground(
      MessageBuilder.applicationComplete(this.currentApplication.queueId, {
        success: result.success,
        applicationId: this.extractApplicationId(),
        submittedAt: Date.now(),
        processingTime,
        stepsCompleted: result.currentStep || 0,
        fieldsCompleted: this.countCompletedFields(),
        result: {
          status: result.success ? 'applied' : 'error',
          confirmationNumber: this.extractConfirmationNumber(),
          redirectUrl: window.location.href,
          message: result.success ? 'Application submitted successfully' : result.errors?.[0] || 'Unknown error'
        },
        errors: result.errors || []
      })
    );
  }

  async reportError(error) {
    if (!this.currentApplication) return;

    await MessageHelper.sendToBackground({
      type: MessageTypes.APPLICATION_ERROR,
      data: {
        queueId: this.currentApplication.queueId,
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        url: window.location.href
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS (Brief examples)
  // ============================================================================

  /**
   * Get platform-specific extraction configuration
   */
  getExtractionConfig(platform) {
    const configs = {
      linkedin: {
        title: '[data-test="job-title"], .job-details-jobs-unified-top-card__job-title',
        company: '[data-test="company-name"], .job-details-jobs-unified-top-card__company-name',
        location: '[data-test="job-location"], .job-details-jobs-unified-top-card__bullet',
        description: '[data-test="job-description"], .job-details-jobs-unified-top-card__job-description',
        salary: '.job-details-jobs-unified-top-card__job-insight--highlight',
        requirements: '.job-details-jobs-unified-top-card__job-description li'
      },
      indeed: {
        title: '[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title',
        company: '[data-testid="company-name"], .jobsearch-InlineCompanyRating',
        location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle',
        description: '[data-testid="jobsearch-JobComponent-description"], .jobsearch-jobDescriptionText',
        salary: '.jobsearch-JobMetadataHeader-item',
        requirements: '.jobsearch-jobDescriptionText li'
      },
      // Add more platform configs...
    };
    
    return configs[platform] || configs.linkedin; // Default fallback
  }

  /**
   * Extract text content efficiently
   */
  extractTextContent(element) {
    if (!element) return null;
    if (Array.isArray(element)) {
      return element.map(el => el?.textContent?.trim()).filter(Boolean).join(' ');
    }
    return element.textContent?.trim() || null;
  }

  /**
   * Cache successful extraction patterns for reuse
   */
  cacheExtractionPattern(jobData) {
    const pattern = {
      platform: jobData.platform,
      selectors: this.getExtractionConfig(jobData.platform),
      timestamp: Date.now()
    };
    
    // Store pattern in session storage for reuse
    try {
      sessionStorage.setItem('job_extraction_pattern', JSON.stringify(pattern));
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Detect current platform
   */
  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com')) return 'indeed';
    if (hostname.includes('glassdoor.com')) return 'glassdoor';
    if (hostname.includes('monster.com')) return 'monster';
    if (hostname.includes('ziprecruiter.com')) return 'ziprecruiter';
    return 'unknown';
  }

  extractApplicationId() {
    // Platform-specific application ID extraction
    const url = new URL(window.location.href);
    return url.searchParams.get('applicationId') || `app_${Date.now()}`;
  }

  extractConfirmationNumber() {
    // Look for confirmation numbers in success messages
    const confirmationEl = document.querySelector('[data-test="confirmation-number"]');
    return confirmationEl?.textContent?.trim() || null;
  }

  countCompletedFields() {
    // Count filled form fields
    const fields = document.querySelectorAll('input[type="text"], input[type="email"], textarea, select');
    return Array.from(fields).filter(field => field.value?.trim()).length;
  }

  cleanup() {
    console.log('🧹 Cleaning up content script resources...');
    
    // Clear intervals
    if (this.memoryCheckInterval) {
      memoryManager.intervals.delete(this.memoryCheckInterval);
      clearInterval(this.memoryCheckInterval);
    }
    
    // Clear DOM cache
    this.domQueryCache.clear();
    
    // Clear application state
    this.currentApplication = null;
    
    // Record cleanup
    performanceMonitor.recordMetric('performance', 'content_script_cleanup', 1);
  }
}

// Initialize content script manager
const contentManager = new ContentScriptManager();

export { ContentScriptManager };
