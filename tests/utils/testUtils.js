// Test Utilities for JobScrapper Chrome Extension Testing Framework
// Provides common testing utilities, helpers, and mock strategies

/**
 * Chrome Extension Test Utilities
 */
export class ChromeExtensionTestUtils {
  constructor() {
    this.messageHandlers = new Map();
    this.storageData = {};
  }
  
  /**
   * Mock Chrome Extension APIs
   */
  mockChromeAPIs() {
    global.chrome = {
      runtime: {
        sendMessage: jest.fn((message, callback) => {
          const handler = this.messageHandlers.get(message.type);
          const response = handler ? handler(message) : { success: true };
          if (callback) callback(response);
        }),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        },
        connect: jest.fn(() => ({
          postMessage: jest.fn(),
          onMessage: { addListener: jest.fn() },
          onDisconnect: { addListener: jest.fn() }
        }))
      },
      
      storage: {
        local: {
          get: jest.fn((keys, callback) => {
            const result = {};
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                if (this.storageData[key] !== undefined) {
                  result[key] = this.storageData[key];
                }
              });
            } else if (typeof keys === 'string') {
              if (this.storageData[keys] !== undefined) {
                result[keys] = this.storageData[keys];
              }
            } else {
              Object.assign(result, this.storageData);
            }
            callback(result);
          }),
          
          set: jest.fn((data, callback) => {
            Object.assign(this.storageData, data);
            if (callback) callback();
          }),
          
          remove: jest.fn((keys, callback) => {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            keysArray.forEach(key => delete this.storageData[key]);
            if (callback) callback();
          }),
          
          clear: jest.fn((callback) => {
            this.storageData = {};
            if (callback) callback();
          })
        },
        
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn()
        }
      },
      
      tabs: {
        query: jest.fn((queryInfo, callback) => {
          const mockTabs = [
            { id: 1, url: 'https://www.linkedin.com/jobs/view/123', active: true },
            { id: 2, url: 'https://www.indeed.com/viewjob?jk=abc123', active: false }
          ];
          callback(mockTabs);
        }),
        
        create: jest.fn((createProperties, callback) => {
          const newTab = { id: Date.now(), ...createProperties };
          if (callback) callback(newTab);
        }),
        
        update: jest.fn(),
        remove: jest.fn(),
        sendMessage: jest.fn()
      },
      
      notifications: {
        create: jest.fn((notificationId, options, callback) => {
          if (callback) callback(notificationId);
        }),
        clear: jest.fn(),
        getAll: jest.fn()
      },
      
      alarms: {
        create: jest.fn(),
        clear: jest.fn(),
        clearAll: jest.fn(),
        get: jest.fn(),
        getAll: jest.fn(),
        onAlarm: { addListener: jest.fn() }
      }
    };
  }
  
  /**
   * Register message handler for testing
   */
  registerMessageHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }
  
  /**
   * Set storage data for testing
   */
  setStorageData(data) {
    this.storageData = { ...this.storageData, ...data };
  }
  
  /**
   * Clear all storage data
   */
  clearStorageData() {
    this.storageData = {};
  }
  
  /**
   * Simulate tab change
   */
  simulateTabChange(url) {
    const mockTab = { id: 1, url, active: true };
    chrome.tabs.query.mockImplementation((queryInfo, callback) => {
      callback([mockTab]);
    });
  }
}

/**
 * DOM Testing Utilities
 */
export class DOMTestUtils {
  /**
   * Create mock job listing elements
   */
  static createJobListingElements(platform, count = 3) {
    const container = document.createElement('div');
    
    for (let i = 0; i < count; i++) {
      const jobElement = this.createJobElement(platform, i);
      container.appendChild(jobElement);
    }
    
    return container;
  }
  
  /**
   * Create individual job element based on platform
   */
  static createJobElement(platform, index = 0) {
    const element = document.createElement('div');
    element.className = `job-listing job-${platform}`;
    element.setAttribute('data-job-id', `${platform}-${index}`);
    
    switch (platform) {
      case 'linkedin':
        element.innerHTML = `
          <div class="job-card-container">
            <h3 class="job-card-list__title">Software Engineer ${index}</h3>
            <h4 class="job-card-container__company-name">Company ${index}</h4>
            <span class="job-card-container__location">Location ${index}</span>
            <button class="jobs-apply-button" data-job-id="${platform}-${index}">Easy Apply</button>
          </div>
        `;
        break;
        
      case 'indeed':
        element.innerHTML = `
          <div class="jobsearch-SerpJobCard">
            <h2 class="title">
              <a href="/viewjob?jk=${platform}-${index}">
                <span>Developer ${index}</span>
              </a>
            </h2>
            <span class="company">Company ${index}</span>
            <div class="location">Location ${index}</div>
            <div class="salary-snippet">$70K - $90K</div>
          </div>
        `;
        break;
        
      case 'glassdoor':
        element.innerHTML = `
          <div class="react-job-listing">
            <h1 class="jobTitle">Engineer ${index}</h1>
            <div class="employerName">Company ${index}</div>
            <div class="jobLocation">Location ${index}</div>
            <button class="apply-btn">Apply Now</button>
          </div>
        `;
        break;
        
      default:
        element.innerHTML = `
          <div class="generic-job">
            <h3>Job ${index}</h3>
            <div>Company ${index}</div>
            <div>Location ${index}</div>
          </div>
        `;
    }
    
    return element;
  }
  
  /**
   * Simulate user interactions
   */
  static simulateClick(element) {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
    return event;
  }
  
  static simulateKeypress(element, key) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
    return event;
  }
  
  static simulateFormSubmit(form) {
    const event = new Event('submit', {
      bubbles: true,
      cancelable: true
    });
    form.dispatchEvent(event);
    return event;
  }
  
  /**
   * Wait for element to appear
   */
  static waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(checkForElement, 100);
        }
      };
      
      checkForElement();
    });
  }
  
  /**
   * Simulate scroll to bottom (infinite scroll testing)
   */
  static simulateScrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
    const event = new Event('scroll');
    window.dispatchEvent(event);
  }
}

/**
 * API Testing Utilities
 */
export class APITestUtils {
  constructor() {
    this.mockedEndpoints = new Map();
  }
  
  /**
   * Mock API endpoint
   */
  mockEndpoint(method, url, response, statusCode = 200) {
    const key = `${method.toUpperCase()} ${url}`;
    this.mockedEndpoints.set(key, { response, statusCode });
  }
  
  /**
   * Mock fetch globally
   */
  mockFetch() {
    global.fetch = jest.fn((url, options = {}) => {
      const method = options.method || 'GET';
      const key = `${method.toUpperCase()} ${url}`;
      const mock = this.mockedEndpoints.get(key);
      
      if (mock) {
        return Promise.resolve({
          ok: mock.statusCode >= 200 && mock.statusCode < 300,
          status: mock.statusCode,
          json: () => Promise.resolve(mock.response),
          text: () => Promise.resolve(JSON.stringify(mock.response))
        });
      }
      
      // Default response for unmocked endpoints
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });
  }
  
  /**
   * Create request matcher for supertest
   */
  createRequestMatcher(expectedRequest) {
    return (req) => {
      const matches = {
        method: !expectedRequest.method || req.method === expectedRequest.method,
        url: !expectedRequest.url || req.url.includes(expectedRequest.url),
        body: !expectedRequest.body || JSON.stringify(req.body) === JSON.stringify(expectedRequest.body),
        headers: !expectedRequest.headers || Object.keys(expectedRequest.headers).every(
          key => req.headers[key.toLowerCase()] === expectedRequest.headers[key]
        )
      };
      
      return Object.values(matches).every(match => match);
    };
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time
   */
  static async measureExecutionTime(fn) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    return {
      result,
      executionTime: endTime - startTime
    };
  }
  
  /**
   * Memory usage testing
   */
  static measureMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  /**
   * Stress test with concurrent operations
   */
  static async stressTest(operation, concurrency = 10, iterations = 100) {
    const results = [];
    const startTime = performance.now();
    
    for (let batch = 0; batch < iterations; batch += concurrency) {
      const batchPromises = [];
      const currentBatchSize = Math.min(concurrency, iterations - batch);
      
      for (let i = 0; i < currentBatchSize; i++) {
        batchPromises.push(operation(batch + i));
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }
    
    const endTime = performance.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      totalTime: endTime - startTime,
      successful,
      failed,
      successRate: successful / results.length,
      averageTime: (endTime - startTime) / results.length
    };
  }
}

/**
 * Data Generation Utilities
 */
export class DataGeneratorUtils {
  /**
   * Generate realistic job data
   */
  static generateJobData(overrides = {}) {
    const titles = [
      'Software Engineer', 'Frontend Developer', 'Backend Engineer', 
      'Full Stack Developer', 'DevOps Engineer', 'Data Scientist',
      'Product Manager', 'UX Designer', 'QA Engineer'
    ];
    
    const companies = [
      'TechCorp', 'StartupInc', 'BigTech Ltd', 'InnovativeSolutions',
      'DataDriven Co', 'CloudFirst Inc', 'AgileTeam LLC'
    ];
    
    const locations = [
      'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
      'Boston, MA', 'Denver, CO', 'Remote', 'Chicago, IL'
    ];
    
    const platforms = ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster'];
    
    return {
      id: `job_${Math.random().toString(36).substr(2, 9)}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      company: companies[Math.floor(Math.random() * companies.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      salary: `$${(Math.random() * 50000 + 70000).toFixed(0)} - $${(Math.random() * 50000 + 120000).toFixed(0)}`,
      url: `https://example.com/job/${Math.random().toString(36).substr(2, 9)}`,
      postedDate: `${Math.floor(Math.random() * 30) + 1} days ago`,
      hasEasyApply: Math.random() > 0.5,
      description: 'Join our team as a talented professional...',
      requirements: ['Bachelor\'s degree', '3+ years experience', 'Strong communication skills'],
      ...overrides
    };
  }
  
  /**
   * Generate application data
   */
  static generateApplicationData(jobId, overrides = {}) {
    const statuses = ['pending', 'applied', 'interviewing', 'rejected', 'accepted'];
    
    return {
      id: `app_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      appliedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      coverLetter: 'I am excited to apply for this position...',
      resume: 'resume_url',
      ...overrides
    };
  }
  
  /**
   * Generate user profile data
   */
  static generateUserProfile(overrides = {}) {
    return {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      experience: '5 years',
      education: 'Bachelor\'s in Computer Science',
      ...overrides
    };
  }
}

/**
 * Test Environment Utilities
 */
export class TestEnvironmentUtils {
  /**
   * Setup test environment
   */
  static setupTestEnvironment() {
    // Mock window.location
    delete window.location;
    window.location = {
      href: 'https://example.com',
      origin: 'https://example.com',
      pathname: '/',
      search: '',
      hash: ''
    };
    
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: ''
    });
    
    // Mock console methods for cleaner test output
    const originalConsole = { ...console };
    global.originalConsole = originalConsole;
    
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  }
  
  /**
   * Cleanup test environment
   */
  static cleanupTestEnvironment() {
    // Restore console
    if (global.originalConsole) {
      Object.assign(console, global.originalConsole);
    }
    
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Clear timers
    jest.clearAllTimers();
    
    // Clear mocks
    jest.clearAllMocks();
  }
  
  /**
   * Mock browser environment
   */
  static mockBrowserEnvironment() {
    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124'
    });
    
    // Mock screen properties
    Object.defineProperty(screen, 'width', { writable: true, value: 1920 });
    Object.defineProperty(screen, 'height', { writable: true, value: 1080 });
    
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 1080 });
  }
}

// Export all utilities
export {
  ChromeExtensionTestUtils,
  DOMTestUtils,
  APITestUtils,
  PerformanceTestUtils,
  DataGeneratorUtils,
  TestEnvironmentUtils
};
