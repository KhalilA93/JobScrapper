// DOM manipulation utilities
export const domUtils = {
  // Wait for element to appear in DOM
  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
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
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },

  // Find apply button for different platforms
  findApplyButton(platform) {
    const selectors = {
      linkedin: [
        '.jobs-apply-button',
        '[data-control-name="jobdetails_topcard_inapply"]',
        'button[aria-label*="Easy Apply"]'
      ],
      indeed: [
        '.jobsearch-IndeedApplyButton-button',
        '[data-tn-element="applyButton"]',
        'button[title*="Apply"]'
      ],
      glassdoor: [
        '.apply-btn',
        'button[data-test="apply-button"]',
        '[class*="apply"]'
      ],
      generic: [
        'button[class*="apply"]',
        'a[class*="apply"]',
        'input[value*="Apply"]',
        '[data-apply]',
        'button:contains("Apply")',
        'a:contains("Apply")'
      ]
    };

    const platformSelectors = selectors[platform] || selectors.generic;
    
    for (const selector of platformSelectors) {
      const button = document.querySelector(selector);
      if (button && this.isVisible(button)) {
        return button;
      }
    }

    return null;
  },

  // Find submit button for application forms
  findSubmitButton(platform) {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[class*="submit"]',
      'button[class*="send"]',
      'button:contains("Submit")',
      'button:contains("Send")',
      'button:contains("Apply")'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && this.isVisible(button) && !button.disabled) {
        return button;
      }
    }

    return null;
  },

  // Check if element is visible
  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetHeight > 0 &&
           element.offsetWidth > 0;
  },

  // Scroll element into view
  scrollIntoView(element, behavior = 'smooth') {
    if (element) {
      element.scrollIntoView({ 
        behavior, 
        block: 'center',
        inline: 'nearest'
      });
    }
  },

  // Highlight element with animation
  highlightElement(element, duration = 2000) {
    if (!element) return;

    element.classList.add('jobscrapper-form-highlight');
    
    setTimeout(() => {
      element.classList.remove('jobscrapper-form-highlight');
    }, duration);
  },

  // Create notification overlay
  createNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `jobscrapper-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '10001',
      padding: '12px 16px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: type === 'error' ? '#f44336' : 
                      type === 'success' ? '#4caf50' : 
                      type === 'warning' ? '#ff9800' : '#2196f3'
    });

    document.body.appendChild(notification);

    // Remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);

    return notification;
  },

  // Safe click with delay
  async safeClick(element, delay = 500) {
    if (!element) return false;

    try {
      this.scrollIntoView(element);
      this.highlightElement(element, 1000);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      element.click();
      return true;
    } catch (error) {
      console.error('Safe click failed:', error);
      return false;
    }
  },

  // Get text content safely
  getTextContent(element, defaultValue = '') {
    if (!element) return defaultValue;
    return element.textContent?.trim() || defaultValue;
  },

  // Check if current page is a job application form
  isApplicationForm() {
    const indicators = [
      'form[action*="apply"]',
      'form[class*="apply"]',
      '[class*="application-form"]',
      '[id*="application"]',
      'input[type="file"]', // Resume upload
      'textarea[name*="cover"]' // Cover letter
    ];

    return indicators.some(selector => document.querySelector(selector));
  }
};
