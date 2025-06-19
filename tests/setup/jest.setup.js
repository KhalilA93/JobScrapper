// Jest setup file for JobScrapper Chrome Extension Testing Framework
import '@testing-library/jest-dom';
import 'jest-chrome';

// Mock Chrome Extension APIs
global.chrome = require('sinon-chrome/extensions');

// Mock fetch API
global.fetch = jest.fn();

// Mock DOM APIs that might not be available in test environment
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock WebRTC APIs that might be used for fingerprinting detection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createDataChannel: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(),
  close: jest.fn(),
}));

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
};

// Setup for JobScraper specific globals
global.JOBSCRAPER_TEST_ENV = true;

// Mock Chrome runtime and messaging
chrome.runtime.sendMessage.yields({ success: true });
chrome.runtime.onMessage.addListener.yields();
chrome.storage.local.get.yields({});
chrome.storage.local.set.yields();

// Custom matchers for JobScraper testing
expect.extend({
  toBeValidJobData(received) {
    const requiredFields = ['title', 'company', 'location', 'url'];
    const hasAllFields = requiredFields.every(field => 
      received && typeof received[field] === 'string' && received[field].length > 0
    );
    
    if (hasAllFields) {
      return {
        message: () => `expected job data to be invalid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected job data to have all required fields: ${requiredFields.join(', ')}`,
        pass: false,
      };
    }
  },
  
  toMatchJobSitePattern(received, siteName) {
    const patterns = {
      linkedin: /linkedin\.com\/jobs/,
      indeed: /indeed\.com\/viewjob/,
      glassdoor: /glassdoor\.com\/job-listing/,
      ziprecruiter: /ziprecruiter\.com\/jobs/,
      monster: /monster\.com\/job-openings/,
    };
    
    const pattern = patterns[siteName.toLowerCase()];
    if (!pattern) {
      return {
        message: () => `Unknown job site: ${siteName}`,
        pass: false,
      };
    }
    
    const matches = pattern.test(received);
    return {
      message: () => `expected ${received} ${matches ? 'not ' : ''}to match ${siteName} URL pattern`,
      pass: matches,
    };
  },
});

// Global test utilities
global.testUtils = {
  // Simulate Chrome extension message passing
  simulateMessage: (message, response = { success: true }) => {
    chrome.runtime.sendMessage.yields(response);
    return chrome.runtime.sendMessage(message);
  },
  
  // Create mock DOM elements for job listings
  createMockJobElement: (jobData = {}) => {
    const element = document.createElement('div');
    element.className = 'job-listing-mock';
    element.innerHTML = `
      <h3 class="job-title">${jobData.title || 'Software Engineer'}</h3>
      <div class="company-name">${jobData.company || 'Tech Corp'}</div>
      <div class="job-location">${jobData.location || 'Remote'}</div>
      <a href="${jobData.url || 'https://example.com/job/123'}" class="job-link">Apply</a>
      <div class="job-description">${jobData.description || 'Great opportunity...'}</div>
    `;
    return element;
  },
  
  // Simulate network delays
  delay: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Reset all mocks between tests
  resetAllMocks: () => {
    jest.clearAllMocks();
    chrome.flush();
    fetch.mockClear();
  },
};

// Setup and teardown for each test
beforeEach(() => {
  // Reset Chrome extension mocks
  chrome.flush();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.mockClear();
  
  // Clear DOM
  document.body.innerHTML = '';
  
  // Reset console mocks
  console.log.mockClear();
  console.error.mockClear();
  console.warn.mockClear();
});

afterEach(() => {
  // Clean up any timers
  jest.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Reset global state
  global.testUtils.resetAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
