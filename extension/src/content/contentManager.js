// JobScrapper Content Script Communication Example
// Demonstrates integration with background service worker

import { MessageHelper, MessageBuilder, MessageTypes } from '../utils/messageProtocol.js';
import { ApplicationStateMachine } from '../utils/applicationStateMachine.js';
import { AutoFillSystem } from '../utils/autoFillSystem.js';
import { contentNotify } from '../utils/notificationIntegration.js';

/**
 * Content Script Integration with Background Service Worker
 * Shows communication patterns and job processing
 */
class ContentScriptManager {
  constructor() {
    this.isProcessing = false;
    this.currentApplication = null;
    this.applicationStartTime = null;
    this.initialize();
  }

  initialize() {
    this.setupMessageListeners();
    this.detectCurrentJob();
    console.log('📱 Content script communication initialized');
  }

  // ============================================================================
  // MESSAGE LISTENERS
  // ============================================================================

  setupMessageListeners() {
    // Listen for job site detection from background
    MessageHelper.onMessage(MessageTypes.JOB_SITE_DETECTED, (data) => {
      console.log(`🎯 Job site detected: ${data.platform}`);
      this.onJobSiteDetected(data);
    });

    // Listen for application start command
    MessageHelper.onMessage(MessageTypes.START_APPLICATION, async (data) => {
      console.log('🚀 Starting application process');
      return await this.startApplication(data);
    });

    // Listen for job checking requests
    MessageHelper.onMessage(MessageTypes.CHECK_FOR_JOBS, () => {
      this.detectCurrentJob();
    });
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

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('linkedin')) return 'linkedin';
    if (hostname.includes('indeed')) return 'indeed';
    if (hostname.includes('glassdoor')) return 'glassdoor';
    return 'generic';
  }

  extractJobId() {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/');
    return pathParts[pathParts.length - 1] || `job_${Date.now()}`;
  }

  findApplyButton() {
    const selectors = [
      '.jobs-apply-button',
      '[data-control-name="jobdetails_topcard_inapply"]',
      'button:contains("Easy Apply")',
      'a:contains("Apply")'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    return null;
  }

  extractRequirements() {
    // Brief implementation
    const requirementElements = document.querySelectorAll('.job-details-preferences-list li');
    return Array.from(requirementElements).map(el => el.textContent?.trim()).filter(Boolean);
  }

  extractSalary() {
    // Brief implementation
    const salaryEl = document.querySelector('[data-test="salary-range"]');
    if (!salaryEl) return null;

    const text = salaryEl.textContent || '';
    const numbers = text.match(/[\d,]+/g);
    if (numbers && numbers.length >= 2) {
      return {
        min: parseInt(numbers[0].replace(/,/g, '')),
        max: parseInt(numbers[1].replace(/,/g, '')),
        currency: 'USD'
      };
    }
    return null;
  }

  onJobSiteDetected(data) {
    // Update UI to show extension is active
    this.showExtensionIndicator(data.platform);
    
    // Start monitoring for jobs
    this.detectCurrentJob();
  }

  showExtensionIndicator(platform) {
    if (document.querySelector('.jobscrapper-indicator')) return;

    const indicator = document.createElement('div');
    indicator.className = 'jobscrapper-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed; 
        top: 10px; 
        right: 10px; 
        background: #0073b1; 
        color: white; 
        padding: 8px 12px; 
        border-radius: 4px; 
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        📋 JobScrapper Active (${platform})
      </div>
    `;
    
    document.body.appendChild(indicator);

    // Remove after 3 seconds
    setTimeout(() => {
      indicator.remove();
    }, 3000);
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
}

// Initialize content script manager
const contentManager = new ContentScriptManager();

export { ContentScriptManager };
