// Job Site Detection Module
// Detects supported job sites and identifies job listing pages

class JobSiteDetector {
  constructor() {
    this.currentSite = null;
    this.isJobPage = false;
    this.eventTarget = new EventTarget();
  }

  // Site configuration with URL patterns and selectors
  static SITE_CONFIGS = {
    linkedin: {
      hostPatterns: ['*://*.linkedin.com/*'],
      jobPagePatterns: [
        /\/jobs\/view\/\d+/,
        /\/jobs\/search/,
        /\/jobs\/collections/
      ],
      selectors: {
        jobListing: '[data-job-id]',
        jobTitle: 'h1[data-test-id="job-title"], .jobs-unified-top-card__job-title',
        company: '.jobs-unified-top-card__company-name a',
        location: '.jobs-unified-top-card__bullet',
        description: '.jobs-description-content__text',
        applyButton: '.jobs-apply-button, [data-control-name="jobdetails_topcard_inapply"]',
        easyApply: '[data-control-name="jobdetails_topcard_inapply"]'
      },
      features: {
        easyApply: true,
        bulkScraping: true,
        salaryData: false
      }
    },

    indeed: {
      hostPatterns: ['*://*.indeed.com/*'],
      jobPagePatterns: [
        /\/viewjob\?jk=/,
        /\/jobs\?/,
        /\/q-.*-jobs/
      ],
      selectors: {
        jobListing: '[data-jk]',
        jobTitle: 'h1[data-testid="jobsearch-JobInfoHeader-title"]',
        company: '[data-testid="inlineHeader-companyName"] a',
        location: '[data-testid="job-location"]',
        description: '#jobDescriptionText',
        applyButton: '#applyButtonLinkContainer a, .jobsearch-IndeedApplyButton',
        salary: '.salary-snippet, [data-testid="job-salary"]'
      },
      features: {
        easyApply: false,
        bulkScraping: true,
        salaryData: true
      }
    },

    glassdoor: {
      hostPatterns: ['*://*.glassdoor.com/*'],
      jobPagePatterns: [
        /\/job-listing\//,
        /\/Jobs\//,
        /\/partner\/jobListing/
      ],
      selectors: {
        jobListing: '[data-test="job-listing"]',
        jobTitle: '[data-test="job-title"]',
        company: '[data-test="employer-name"]',
        location: '[data-test="job-location"]',
        description: '[data-test="jobDescriptionContainer"]',
        applyButton: '[data-test="apply-btn"]',
        salary: '[data-test="pay-range"]'
      },
      features: {
        easyApply: false,
        bulkScraping: false,
        salaryData: true
      }
    }
  };

  // Initialize detection
  init() {
    try {
      this.detectCurrentSite();
      if (this.currentSite) {
        this.checkJobPage();
        this.setupUrlMonitoring();
        this.emitDetectionEvent();
      }
    } catch (error) {
      console.error('JobSiteDetector: Initialization failed', error);
    }
  }

  // Detect which job site we're on
  detectCurrentSite() {
    const hostname = window.location.hostname.toLowerCase();
    
    for (const [siteName, config] of Object.entries(JobSiteDetector.SITE_CONFIGS)) {
      if (this.matchesHostPattern(hostname, config.hostPatterns)) {
        this.currentSite = {
          name: siteName,
          config: config,
          hostname: hostname
        };
        break;
      }
    }
  }
  // Check if hostname matches any pattern
  matchesHostPattern(hostname, patterns) {
    return patterns.some(pattern => {
      const regex = new RegExp(
        pattern
          .replace(/\*/g, '.*')
          .replace(/\./g, '\\.')
      );
      return regex.test(hostname);
    });
  }

  // Check if current page is a job listing page
  checkJobPage() {
    if (!this.currentSite) return false;

    const url = window.location.href;
    const pathname = window.location.pathname;
    const { jobPagePatterns } = this.currentSite.config;

    // Check URL patterns
    this.isJobPage = jobPagePatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(pathname) || pattern.test(url);
      }
      return pathname.includes(pattern) || url.includes(pattern);
    });

    // Additional DOM-based detection for edge cases
    if (!this.isJobPage) {
      this.isJobPage = this.detectJobPageByContent();
    }

    return this.isJobPage;
  }

  // Fallback: detect job page by presence of job-related elements
  detectJobPageByContent() {
    if (!this.currentSite) return false;

    const { selectors } = this.currentSite.config;
    const indicators = [
      selectors.jobTitle,
      selectors.company,
      selectors.applyButton,
      selectors.jobListing
    ];

    // Check if at least 2 job-related elements are present
    const foundElements = indicators.filter(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });

    return foundElements.length >= 2;
  }

  // Monitor URL changes for SPA navigation
  setupUrlMonitoring() {
    let currentUrl = window.location.href;

    // Monitor pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleUrlChange();
    };

    // Monitor popstate events
    window.addEventListener('popstate', () => this.handleUrlChange());

    // Periodic check for URL changes (fallback)
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.handleUrlChange();
      }
    }, 1000);
  }

  // Handle URL changes
  handleUrlChange() {
    const wasJobPage = this.isJobPage;
    this.checkJobPage();

    if (wasJobPage !== this.isJobPage) {
      this.emitDetectionEvent();
    }
  }

  // Emit detection events
  emitDetectionEvent() {
    const eventData = {
      site: this.currentSite?.name || null,
      config: this.currentSite?.config || null,
      isJobPage: this.isJobPage,
      url: window.location.href,
      timestamp: Date.now()
    };

    // Custom event
    this.eventTarget.dispatchEvent(
      new CustomEvent('siteDetected', { detail: eventData })
    );

    // Global event for other scripts
    window.dispatchEvent(
      new CustomEvent('jobSiteDetected', { detail: eventData })
    );

    console.log('JobSiteDetector:', eventData);
  }

  // Public API methods
  getCurrentSite() {
    return this.currentSite;
  }

  isOnJobPage() {
    return this.isJobPage;
  }

  getSelectors() {
    return this.currentSite?.config?.selectors || {};
  }

  getSiteFeatures() {
    return this.currentSite?.config?.features || {};
  }

  // Event listeners
  onSiteDetected(callback) {
    this.eventTarget.addEventListener('siteDetected', callback);
  }

  onJobPageEntered(callback) {
    this.eventTarget.addEventListener('siteDetected', (event) => {
      if (event.detail.isJobPage) {
        callback(event.detail);
      }
    });
  }

  // Check if site supports specific feature
  supportsFeature(featureName) {
    return this.currentSite?.config?.features?.[featureName] || false;
  }

  // Get element using site-specific selector
  getElement(selectorKey) {
    const selectors = this.getSelectors();
    const selector = selectors[selectorKey];
    
    if (!selector) {
      console.warn(`JobSiteDetector: No selector found for '${selectorKey}'`);
      return null;
    }

    try {
      return document.querySelector(selector);
    } catch (error) {
      console.error(`JobSiteDetector: Invalid selector '${selector}'`, error);
      return null;
    }
  }

  // Wait for element to appear
  async waitForElement(selectorKey, timeout = 5000) {
    const selector = this.getSelectors()[selectorKey];
    if (!selector) return null;

    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
}

export { JobSiteDetector };
