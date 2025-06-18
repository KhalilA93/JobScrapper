// Job Site Stealth Patterns
// Specialized stealth techniques for different job platforms

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils, StealthInteractions, StealthRateLimit } from './stealthUtils.js';

class JobSiteStealth {
  constructor() {
    this.stealth = new StealthScraper({
      minActionDelay: 800,
      maxActionDelay: 3000,
      maxRequestsPerMinute: 20, // Conservative for job sites
      enableMouseSimulation: true,
      enableScrollSimulation: true
    });
    
    this.sitePatterns = {
      linkedin: new LinkedInStealth(this.stealth),
      indeed: new IndeedStealth(this.stealth),
      glassdoor: new GlassdoorStealth(this.stealth)
    };
  }

  // Get site-specific stealth handler
  getSiteHandler(siteName) {
    return this.sitePatterns[siteName] || new GenericJobSiteStealth(this.stealth);
  }

  // Universal job application flow
  async applyToJob(siteName, jobElement, applicationData = {}) {
    const handler = this.getSiteHandler(siteName);
    return handler.applyToJob(jobElement, applicationData);
  }

  // Universal job browsing
  async browseJobs(siteName, searchParams = {}) {
    const handler = this.getSiteHandler(siteName);
    return handler.browseJobs(searchParams);
  }
}

// Base class for job site stealth patterns
class BaseJobSiteStealth {
  constructor(stealthInstance) {
    this.stealth = stealthInstance;
  }

  // Pre-interaction setup
  async setupInteraction() {
    // Check rate limits
    await this.stealth.checkRateLimit();
    
    // Random pre-action delay
    await StealthUtils.actionDelay();
    
    // Simulate natural browsing behavior
    if (Math.random() < 0.3) {
      await this.simulateNaturalBrowsing();
    }
  }

  // Simulate natural browsing before main action
  async simulateNaturalBrowsing() {
    const actions = [
      () => this.stealth.simulateScroll(window, { distance: 200 }),
      () => this.moveMouseRandomly(),
      () => StealthUtils.readingDelay(100),
      () => this.checkOtherJobsOnPage()
    ];
    
    const actionCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < actionCount; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
    }
  }

  // Random mouse movement
  async moveMouseRandomly() {
    const elements = document.querySelectorAll('h1, h2, h3, .job-title, .company-name');
    if (elements.length > 0) {
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      await this.stealth.simulateMouseMovement(randomElement);
    }
  }

  // Briefly look at other jobs (natural behavior)
  async checkOtherJobsOnPage() {
    const jobElements = document.querySelectorAll('[data-job-id], .job-card, .job-listing');
    if (jobElements.length > 1) {
      const randomJob = jobElements[Math.floor(Math.random() * Math.min(3, jobElements.length))];
      await this.stealth.simulateMouseMovement(randomJob);
      await StealthUtils.readingDelay(50);
    }
  }
}

// LinkedIn-specific stealth patterns
class LinkedInStealth extends BaseJobSiteStealth {
  async applyToJob(jobElement, applicationData = {}) {
    await this.setupInteraction();
    
    // LinkedIn-specific application flow
    try {
      // Click on job to view details
      await StealthInteractions.carefulClick(jobElement);
      await this.readJobDetails();
      
      // Look for Easy Apply button
      const easyApplyButton = await this.stealth.waitForElement(
        '[data-control-name*="jobdetails_topcard_inapply"], .jobs-apply-button--top-card',
        { timeout: 5000 }
      );
      
      if (easyApplyButton) {
        return this.handleEasyApply(easyApplyButton, applicationData);
      } else {
        return this.handleExternalApply();
      }
      
    } catch (error) {
      console.error('LinkedIn application failed:', error);
      return { success: false, error: error.message };
    }
  }

  async readJobDetails() {
    // Simulate reading job description
    await StealthUtils.readingDelay(400);
    
    // Scroll to see more details
    const descriptionElement = document.querySelector('.jobs-description-content__text');
    if (descriptionElement) {
      await this.stealth.scrollToElement(descriptionElement);
      await StealthUtils.readingDelay(200);
    }
    
    // Check company info
    const companyElement = document.querySelector('.jobs-unified-top-card__company-name');
    if (companyElement) {
      await this.stealth.simulateMouseMovement(companyElement);
      await StealthUtils.microDelay();
    }
  }

  async handleEasyApply(applyButton, applicationData) {
    // Click Easy Apply
    await StealthInteractions.naturalClick(applyButton);
    
    // Wait for application modal
    await StealthUtils.pageDelay();
    
    // Handle multi-step application process
    let step = 1;
    const maxSteps = 5;
    
    while (step <= maxSteps) {
      const continueButton = document.querySelector('[data-control-name="continue_unify"]');
      const submitButton = document.querySelector('[data-control-name="submit_unify"]');
      
      if (submitButton) {
        // Final step - submit application
        await this.fillAdditionalInfo(applicationData);
        await StealthInteractions.carefulClick(submitButton);
        await StealthUtils.pageDelay();
        break;
      } else if (continueButton) {
        // Intermediate step
        await this.handleApplicationStep(step, applicationData);
        await StealthInteractions.naturalClick(continueButton);
        await StealthUtils.actionDelay();
        step++;
      } else {
        break;
      }
    }
    
    // Post-application delay
    await StealthRateLimit.jobApplicationDelay();
    
    return { success: true, method: 'easy_apply', steps: step };
  }

  async handleApplicationStep(step, applicationData) {
    // Handle different application steps
    switch (step) {
      case 1:
        await this.handleContactInfo(applicationData);
        break;
      case 2:
        await this.handleResumeStep(applicationData);
        break;
      case 3:
        await this.handleCoverLetterStep(applicationData);
        break;
      case 4:
        await this.handleAdditionalQuestions(applicationData);
        break;
    }
    
    await StealthUtils.actionDelay();
  }

  async handleContactInfo(applicationData) {
    const phoneInput = document.querySelector('input[name*="phone"], input[id*="phone"]');
    if (phoneInput && applicationData.phone) {
      await StealthInteractions.naturalClick(phoneInput);
      await this.stealth.simulateTyping(phoneInput, applicationData.phone);
    }
  }

  async handleResumeStep(applicationData) {
    // LinkedIn usually auto-fills resume, just verify
    await StealthUtils.readingDelay(100);
  }

  async handleCoverLetterStep(applicationData) {
    const coverLetterTextarea = document.querySelector('textarea[name*="cover"], textarea[id*="cover"]');
    if (coverLetterTextarea && applicationData.coverLetter) {
      await StealthInteractions.naturalClick(coverLetterTextarea);
      await this.stealth.simulateTyping(coverLetterTextarea, applicationData.coverLetter, {
        minDelay: 100,
        maxDelay: 300
      });
    }
  }

  async handleAdditionalQuestions(applicationData) {
    const questions = document.querySelectorAll('.jobs-easy-apply-form-section__grouping');
    
    for (const question of questions) {
      const input = question.querySelector('input, select, textarea');
      if (input && applicationData.customAnswers) {
        const questionText = question.querySelector('label, .t-bold')?.textContent || '';
        const answer = this.findAnswerForQuestion(questionText, applicationData.customAnswers);
        
        if (answer) {
          await StealthInteractions.naturalClick(input);
          await this.stealth.simulateTyping(input, answer);
        }
      }
      
      await StealthUtils.microDelay();
    }
  }

  findAnswerForQuestion(questionText, customAnswers) {
    // Simple keyword matching for common questions
    const lowerQuestion = questionText.toLowerCase();
    
    for (const [key, value] of Object.entries(customAnswers)) {
      if (lowerQuestion.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Default answers for common questions
    if (lowerQuestion.includes('sponsor')) return 'No';
    if (lowerQuestion.includes('experience')) return customAnswers.experience || '3-5 years';
    if (lowerQuestion.includes('salary')) return customAnswers.expectedSalary || 'Negotiable';
    
    return null;
  }

  async browseJobs(searchParams = {}) {
    await this.setupInteraction();
    
    // LinkedIn job browsing pattern
    if (searchParams.keyword) {
      const searchInput = document.querySelector('input[data-control-name="keyword_search_suggestions_search_box"]');
      if (searchInput) {
        await StealthInteractions.performSearch(searchInput, searchParams.keyword);
      }
    }
    
    // Apply filters naturally
    if (searchParams.location || searchParams.datePosted || searchParams.experienceLevel) {
      await this.applySearchFilters(searchParams);
    }
    
    // Browse results
    await this.browseSearchResults();
    
    return { success: true };
  }

  async applySearchFilters(params) {
    // Location filter
    if (params.location) {
      const locationInput = document.querySelector('input[data-control-name="location_search_suggestions_search_box"]');
      if (locationInput) {
        await StealthInteractions.naturalClick(locationInput);
        await this.stealth.simulateTyping(locationInput, params.location);
        await StealthUtils.actionDelay();
      }
    }
    
    // Other filters would be handled similarly
    await StealthUtils.actionDelay();
  }

  async browseSearchResults() {
    // Natural result browsing
    await StealthInteractions.exploreContent({
      scrollCount: 3,
      readSections: true,
      backtrack: 0.2
    });
    
    // Click on a few job listings to appear engaged
    const jobCards = document.querySelectorAll('[data-job-id]');
    const viewCount = Math.min(3, Math.floor(Math.random() * 5) + 1);
    
    for (let i = 0; i < viewCount && i < jobCards.length; i++) {
      const randomIndex = Math.floor(Math.random() * jobCards.length);
      await StealthInteractions.naturalClick(jobCards[randomIndex]);
      await this.readJobDetails();
      await StealthRateLimit.profileViewDelay();
    }
  }

  async handleExternalApply() {
    // Handle external application links
    const externalButton = document.querySelector('[data-control-name*="external"], .jobs-apply-button');
    if (externalButton) {
      await StealthInteractions.carefulClick(externalButton);
      return { success: true, method: 'external_redirect' };
    }
    
    return { success: false, reason: 'no_apply_method_found' };
  }
}

// Indeed-specific stealth patterns
class IndeedStealth extends BaseJobSiteStealth {
  async applyToJob(jobElement, applicationData = {}) {
    await this.setupInteraction();
    
    // Indeed application flow
    await StealthInteractions.carefulClick(jobElement);
    await StealthUtils.readingDelay(300);
    
    const applyButton = await this.stealth.waitForElement(
      '.jobsearch-IndeedApplyButton, #applyButtonLinkContainer a',
      { timeout: 5000 }
    );
    
    if (applyButton) {
      await StealthInteractions.naturalClick(applyButton);
      return { success: true, method: 'indeed_apply' };
    }
    
    return { success: false, reason: 'no_apply_button' };
  }

  async browseJobs(searchParams = {}) {
    await this.setupInteraction();
    // Indeed browsing implementation
    return { success: true };
  }
}

// Glassdoor-specific stealth patterns
class GlassdoorStealth extends BaseJobSiteStealth {
  async applyToJob(jobElement, applicationData = {}) {
    await this.setupInteraction();
    // Glassdoor application implementation
    return { success: true, method: 'glassdoor_apply' };
  }

  async browseJobs(searchParams = {}) {
    await this.setupInteraction();
    // Glassdoor browsing implementation
    return { success: true };
  }
}

// Generic fallback for other job sites
class GenericJobSiteStealth extends BaseJobSiteStealth {
  async applyToJob(jobElement, applicationData = {}) {
    await this.setupInteraction();
    
    // Generic application attempt
    const applySelectors = [
      '.apply-btn', '.apply-button', 'button[class*="apply"]',
      'a[href*="apply"]', '[data-test*="apply"]'
    ];
    
    for (const selector of applySelectors) {
      const button = document.querySelector(selector);
      if (button) {
        await StealthInteractions.naturalClick(button);
        return { success: true, method: 'generic_apply' };
      }
    }
    
    return { success: false, reason: 'no_apply_method' };
  }

  async browseJobs(searchParams = {}) {
    await this.setupInteraction();
    return { success: true };
  }
}

export { JobSiteStealth };
