import { JobSiteDetector } from './jobSiteDetector.js';
import { jobScrapers } from '@utils/scrapers';
import { formFiller } from '@utils/formFiller';
import { domUtils } from '@utils/domUtils';

class ContentScript {
  constructor() {
    this.platform = null;
    this.isActive = false;
    this.detector = new JobSiteDetector();
    this.initialize();
  }
  initialize() {
    // Initialize job site detection
    this.detector.init();
    
    // Listen for site detection events
    this.detector.onSiteDetected((event) => {
      const { site, isJobPage } = event.detail;
      this.platform = site;
      this.isActive = isJobPage;
      
      if (isJobPage) {
        console.log(`JobScrapper: Detected ${site} job page`);
        this.handleJobPageDetected(event.detail);
      }
    });

    this.setupMessageListener();
    this.startObserving();
  }

  handleJobPageDetected(siteData) {
    // Handle job page detection
    this.platform = siteData.site;
    this.setupJobPageFeatures(siteData);
    
    // Notify background script
    this.sendMessage('JOB_SITE_DETECTED', { 
      platform: this.platform,
      isJobPage: true,
      features: siteData.config.features
    });
  }

  setupJobPageFeatures(siteData) {
    // Setup features based on detected site
    if (siteData.config.features.easyApply) {
      this.setupEasyApply();
    }
    
    // Initialize scraping capabilities
    this.isActive = true;
  }

  setupEasyApply() {
    // Easy apply functionality
    console.log('Setting up Easy Apply for', this.platform);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'SCRAPE_JOBS':
          await this.scrapeJobs();
          break;
        case 'AUTO_APPLY':
          await this.autoApply(request.data);
          break;
        case 'FILL_FORM':
          await this.fillApplicationForm(request.data);
          break;
        case 'GET_JOB_DETAILS':
          const jobDetails = await this.getJobDetails();
          sendResponse(jobDetails);
          break;
        default:
          console.warn('Unknown content script message:', request.type);
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async scrapeJobs() {
    if (!this.platform) return;

    try {
      const scraper = jobScrapers[this.platform];
      if (!scraper) {
        console.warn(`No scraper available for ${this.platform}`);
        return;
      }

      const jobs = await scraper.extractJobs();
      
      for (const job of jobs) {
        await this.sendMessage('JOB_DETECTED', {
          ...job,
          platform: this.platform,
          url: window.location.href,
          scrapedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error scraping jobs:', error);
    }
  }

  async autoApply(settings) {
    if (!this.platform) return;

    try {
      const jobDetails = await this.getJobDetails();
      
      if (!this.shouldApply(jobDetails, settings)) {
        console.log('Job does not match criteria, skipping');
        return;
      }

      // Find and click apply button
      const applyButton = domUtils.findApplyButton(this.platform);
      if (!applyButton) {
        console.warn('Apply button not found');
        return;
      }

      applyButton.click();
      
      // Wait for form to load and fill it
      await domUtils.waitForElement('form, [role="dialog"]');
      await this.fillApplicationForm(settings.userProfile);
      
      // Submit if auto-submit is enabled
      if (settings.autoSubmit) {
        await this.submitApplication();
      }

    } catch (error) {
      console.error('Auto-apply error:', error);
    }
  }

  async fillApplicationForm(userProfile) {
    try {
      const filler = formFiller[this.platform] || formFiller.generic;
      await filler.fillForm(userProfile);
    } catch (error) {
      console.error('Form filling error:', error);
    }
  }

  async getJobDetails() {
    if (!this.platform) return null;

    try {
      const scraper = jobScrapers[this.platform];
      return scraper ? await scraper.extractCurrentJob() : null;
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  }

  shouldApply(jobDetails, settings) {
    if (!jobDetails || !settings) return false;

    // Check salary requirements
    if (settings.minSalary && jobDetails.salary < settings.minSalary) {
      return false;
    }

    // Check location preferences
    if (settings.locations?.length && 
        !settings.locations.some(loc => 
          jobDetails.location?.toLowerCase().includes(loc.toLowerCase())
        )) {
      return false;
    }

    // Check experience level
    if (settings.experienceLevel && 
        jobDetails.experienceLevel !== settings.experienceLevel) {
      return false;
    }

    return true;
  }

  async submitApplication() {
    const submitButton = domUtils.findSubmitButton(this.platform);
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
      
      await this.sendMessage('APPLICATION_SUBMITTED', {
        jobDetails: await this.getJobDetails(),
        platform: this.platform,
        submittedAt: new Date().toISOString()
      });
    }
  }

  startObserving() {
    // Observe DOM changes for dynamic content
    const observer = new MutationObserver(() => {
      if (this.platform && !this.isActive) {
        this.isActive = true;
        setTimeout(() => this.scrapeJobs(), 2000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  sendMessage(type, data) {
    return chrome.runtime.sendMessage({ type, data });
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContentScript());
} else {
  new ContentScript();
}
