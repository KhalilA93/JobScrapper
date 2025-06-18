// Stealth Utility Functions
// Common patterns for natural web scraping behavior

import { StealthScraper } from './stealthScraper.js';

// Global stealth instance
const stealth = new StealthScraper();

// Human-like delay utilities
export const StealthUtils = {
  // Quick delay for micro-interactions
  async microDelay() {
    return stealth.randomDelay(50, 200);
  },

  // Standard delay between actions
  async actionDelay() {
    return stealth.randomDelay(500, 1500);
  },

  // Longer delay for page transitions
  async pageDelay() {
    return stealth.randomDelay(2000, 5000);
  },

  // Reading delay (simulate user reading content)
  async readingDelay(textLength = 100) {
    // Average reading speed: 200-300 words per minute
    const wordsPerMinute = 200 + Math.random() * 100;
    const words = Math.ceil(textLength / 5); // Rough word count
    const readingTime = (words / wordsPerMinute) * 60 * 1000;
    
    return stealth.randomDelay(
      Math.max(500, readingTime * 0.3),
      readingTime * 1.2
    );
  }
};

// DOM interaction patterns
export const StealthInteractions = {
  // Natural click with full simulation
  async naturalClick(element, options = {}) {
    await stealth.simulateClick(element, {
      hover: true,
      scroll: true,
      delay: true,
      ...options
    });
  },

  // Quick click without hover (for familiar interfaces)
  async quickClick(element) {
    await stealth.simulateClick(element, {
      hover: false,
      scroll: false,
      delay: true
    });
  },

  // Careful click with extra precautions
  async carefulClick(element, options = {}) {
    // Extra scroll to ensure visibility
    await stealth.scrollToElement(element, { offset: 200 });
    await StealthUtils.actionDelay();
    
    // Hover and observe
    await stealth.simulateMouseMovement(element);
    await StealthUtils.readingDelay(50);
    
    // Click with longer delay
    await stealth.simulateClick(element, {
      hover: false, // Already hovered
      scroll: false, // Already scrolled
      delay: true,
      ...options
    });
  },

  // Natural form filling
  async fillForm(formData, options = {}) {
    const {
      fieldDelay = true,
      tabNavigation = false
    } = options;
    
    for (const [selector, value] of Object.entries(formData)) {
      const field = await stealth.waitForElement(selector);
      
      if (fieldDelay) {
        await StealthUtils.actionDelay();
      }
      
      // Click to focus
      await this.naturalClick(field);
      
      // Clear existing value
      if (field.value) {
        field.select();
        await StealthUtils.microDelay();
      }
      
      // Type value
      await stealth.simulateTyping(field, value, {
        mistakes: 0.01 // 1% chance of typos
      });
      
      // Tab to next field occasionally
      if (tabNavigation && Math.random() < 0.3) {
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        await StealthUtils.microDelay();
      }
    }
  },

  // Natural scrolling patterns
  async exploreContent(options = {}) {
    const {
      scrollCount = 3,
      readSections = true,
      backtrack = 0.2 // 20% chance to scroll back up
    } = options;
    
    for (let i = 0; i < scrollCount; i++) {
      // Scroll down
      await stealth.simulateScroll(window, {
        direction: 'down',
        distance: 'random',
        steps: 2 + Math.floor(Math.random() * 3)
      });
      
      if (readSections) {
        await StealthUtils.readingDelay(200);
      }
      
      // Occasionally scroll back up (natural reading behavior)
      if (Math.random() < backtrack) {
        await stealth.simulateScroll(window, {
          direction: 'up',
          distance: Math.floor(100 + Math.random() * 200),
          steps: 2
        });
        
        await StealthUtils.readingDelay(100);
      }
    }
  },

  // Search interaction pattern
  async performSearch(searchInput, query, options = {}) {
    const {
      clearFirst = true,
      submitMethod = 'enter' // 'enter' or 'button'
    } = options;
    
    // Focus on search input
    await this.naturalClick(searchInput);
    
    if (clearFirst && searchInput.value) {
      // Select all and clear
      searchInput.select();
      await StealthUtils.microDelay();
    }
    
    // Type search query
    await stealth.simulateTyping(searchInput, query, {
      minDelay: 80,
      maxDelay: 300,
      mistakes: 0.02
    });
    
    // Submit search
    if (submitMethod === 'enter') {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    } else {
      const submitButton = await stealth.waitForElement(options.submitSelector || 'button[type="submit"]');
      await this.naturalClick(submitButton);
    }
    
    await StealthUtils.pageDelay();
  }
};

// Rate limiting patterns
export const StealthRateLimit = {
  // Job application rate limiting
  async jobApplicationDelay() {
    // 5-15 minutes between applications
    const delay = 5 * 60 * 1000 + Math.random() * 10 * 60 * 1000;
    console.log(`StealthRateLimit: Waiting ${Math.round(delay / 60000)} minutes before next application`);
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  // Search result page delays
  async searchPageDelay() {
    // 10-30 seconds between search pages
    return stealth.randomDelay(10000, 30000);
  },

  // Profile view delays
  async profileViewDelay() {
    // 3-8 seconds between profile views
    return stealth.randomDelay(3000, 8000);
  },

  // Bulk operation delays
  async bulkOperationDelay(operationCount) {
    // Exponential backoff for bulk operations
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(1.5, Math.min(operationCount, 10));
    const jitter = exponentialDelay * 0.1 * Math.random();
    
    return new Promise(resolve => setTimeout(resolve, exponentialDelay + jitter));
  }
};

// Detection avoidance patterns
export const StealthAvoidance = {
  // Randomize viewport and browser fingerprint
  async randomizeFingerprint() {
    // Randomize screen resolution (within common ranges)
    const resolutions = [
      [1920, 1080], [1366, 768], [1536, 864], [1440, 900], [1280, 720]
    ];
    
    const [width, height] = resolutions[Math.floor(Math.random() * resolutions.length)];
    
    // This would typically be done at the browser level
    // For content scripts, we can only modify certain properties
    try {
      Object.defineProperty(screen, 'width', { value: width });
      Object.defineProperty(screen, 'height', { value: height });
    } catch (e) {
      // Properties may be read-only
    }
  },

  // Break behavioral patterns
  async breakPattern() {
    const actions = [
      () => StealthUtils.microDelay(),
      () => stealth.simulateScroll(window, { distance: 50, steps: 1 }),
      () => new Promise(resolve => {
        // Move mouse to random position
        document.dispatchEvent(new MouseEvent('mousemove', {
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight
        }));
        setTimeout(resolve, 100);
      }),
      () => StealthUtils.readingDelay(50)
    ];
    
    // Randomly perform 1-3 actions
    const actionCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < actionCount; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
    }
  },

  // Simulate human errors and corrections
  async simulateHumanError() {
    const errorTypes = [
      'wrong_click',
      'accidental_scroll',
      'mouse_slip',
      'second_thought'
    ];
    
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    switch (errorType) {
      case 'wrong_click':
        // Click somewhere random, then pause and continue
        const randomElement = document.elementFromPoint(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight
        );
        if (randomElement && randomElement.tagName !== 'A') {
          await StealthInteractions.quickClick(randomElement);
          await StealthUtils.actionDelay();
        }
        break;
        
      case 'accidental_scroll':
        // Small accidental scroll, then correct
        await stealth.simulateScroll(window, { distance: 50, steps: 1 });
        await StealthUtils.microDelay();
        await stealth.simulateScroll(window, { direction: 'up', distance: 60, steps: 1 });
        break;
        
      case 'mouse_slip':
        // Move mouse erratically, then settle
        for (let i = 0; i < 3; i++) {
          document.dispatchEvent(new MouseEvent('mousemove', {
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
          }));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        break;
        
      case 'second_thought':
        // Pause as if reconsidering
        await StealthUtils.readingDelay(100);
        break;
    }
  }
};

// Session management
export const StealthSession = {
  // Track session behavior
  sessionData: {
    startTime: Date.now(),
    actions: [],
    pageViews: 0,
    totalDelay: 0
  },

  // Log action for pattern analysis
  logAction(action, element = null) {
    this.sessionData.actions.push({
      action,
      timestamp: Date.now(),
      element: element ? element.tagName : null,
      pageUrl: window.location.href
    });
    
    // Keep only last 100 actions
    if (this.sessionData.actions.length > 100) {
      this.sessionData.actions.shift();
    }
  },

  // Get session statistics
  getSessionStats() {
    const duration = Date.now() - this.sessionData.startTime;
    const actionCount = this.sessionData.actions.length;
    
    return {
      duration: Math.round(duration / 1000), // seconds
      actionCount,
      averageActionInterval: actionCount > 1 ? duration / (actionCount - 1) : 0,
      pageViews: this.sessionData.pageViews,
      actionsPerMinute: actionCount / (duration / 60000)
    };
  },

  // Check if behavior looks suspicious
  isSuspiciousBehavior() {
    const stats = this.getSessionStats();
    
    // Red flags
    const suspiciousIndicators = [
      stats.actionsPerMinute > 60, // Too fast
      stats.averageActionInterval < 100, // Too consistent
      stats.actionCount > 500 && stats.duration < 600, // Too many actions too quickly
      stats.pageViews > 100 && stats.duration < 1800 // Too many pages too quickly
    ];
    
    return suspiciousIndicators.some(indicator => indicator);
  }
};

// Pre-configured stealth patterns for common scenarios
export const StealthPatterns = {
  // Job search browsing pattern
  async jobSearchBrowsing(searchTerm) {
    StealthSession.logAction('job_search_start');
    
    // Natural search entry
    const searchInput = await stealth.waitForElement('input[type="search"], input[name="q"]');
    await StealthInteractions.performSearch(searchInput, searchTerm);
    
    // Browse results
    await StealthInteractions.exploreContent({
      scrollCount: 2 + Math.floor(Math.random() * 3),
      readSections: true,
      backtrack: 0.3
    });
    
    // Occasionally break pattern
    if (Math.random() < 0.2) {
      await StealthAvoidance.simulateHumanError();
    }
    
    StealthSession.logAction('job_search_complete');
  },

  // Job application pattern
  async jobApplication(jobElement, formData) {
    StealthSession.logAction('job_application_start');
    
    // View job details first
    await StealthInteractions.carefulClick(jobElement);
    await StealthUtils.readingDelay(300); // Read job description
    
    // Find and click apply button
    const applyButton = await stealth.waitForElement('[data-control-name*="apply"], .apply-button, button:contains("Apply")');
    await StealthInteractions.naturalClick(applyButton);
    
    // Fill application form
    if (formData && Object.keys(formData).length > 0) {
      await StealthInteractions.fillForm(formData, {
        fieldDelay: true,
        tabNavigation: true
      });
    }
    
    // Rate limit before next application
    await StealthRateLimit.jobApplicationDelay();
    
    StealthSession.logAction('job_application_complete');
  }
};

export { stealth };
