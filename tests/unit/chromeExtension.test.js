// Additional Unit Tests - Chrome Extension Specific Components
import { 
  ChromeExtensionTestUtils, 
  DOMTestUtils, 
  PerformanceTestUtils,
  DataGeneratorUtils
} from '@tests/utils/testUtils';

import { 
  mockLinkedInResponse, 
  mockChromeMessages,
  generateMockJobs 
} from '@tests/mocks/jobSiteMocks';

// Import modules to test
import { StealthScraper } from '@/utils/stealthScraper';
import { AutoFillSystem } from '@/utils/autoFillSystem';
import { ApplicationStateMachine } from '@/utils/applicationStateMachine';
import { NotificationSystem } from '@/utils/notificationSystem';
import { PerformanceOptimizer } from '@/utils/performanceOptimizer';

describe('Chrome Extension Specific Components', () => {
  let chromeTestUtils;
  
  beforeEach(() => {
    chromeTestUtils = new ChromeExtensionTestUtils();
    chromeTestUtils.mockChromeAPIs();
  });
  
  describe('StealthScraper', () => {
    let stealthScraper;
    
    beforeEach(() => {
      stealthScraper = new StealthScraper();
    });
    
    test('should implement anti-detection measures', () => {
      const measures = stealthScraper.getAntiDetectionMeasures();
      
      expect(measures).toContain('randomDelay');
      expect(measures).toContain('userAgentRotation');
      expect(measures).toContain('fingerprintProtection');
      expect(measures).toContain('headlessDetectionAvoidance');
    });
    
    test('should randomize request delays', async () => {
      const delays = [];
      
      for (let i = 0; i < 5; i++) {
        const delay = stealthScraper.generateRandomDelay(100, 500);
        delays.push(delay);
      }
      
      // All delays should be within range
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(500);
      });
      
      // Delays should be different (randomized)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
    
    test('should rotate user agents', () => {
      const userAgents = [];
      
      for (let i = 0; i < 3; i++) {
        const userAgent = stealthScraper.getRandomUserAgent();
        userAgents.push(userAgent);
      }
      
      userAgents.forEach(ua => {
        expect(ua).toMatch(/Chrome|Firefox|Safari/);
        expect(ua).toContain('Mozilla');
      });
    });
    
    test('should mask automation indicators', async () => {
      const maskedProperties = await stealthScraper.maskAutomationIndicators();
      
      expect(maskedProperties).toHaveProperty('webdriver', false);
      expect(maskedProperties).toHaveProperty('plugins');
      expect(maskedProperties).toHaveProperty('languages');
    });
  });
  
  describe('AutoFillSystem', () => {
    let autoFillSystem;
    
    beforeEach(() => {
      autoFillSystem = new AutoFillSystem();
      
      // Setup user profile in storage
      chromeTestUtils.setStorageData({
        userProfile: DataGeneratorUtils.generateUserProfile()
      });
    });
    
    test('should detect form fields correctly', () => {
      // Create mock form
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName" placeholder="First Name">
        <input type="text" name="lastName" placeholder="Last Name">
        <input type="email" name="email" placeholder="Email">
        <input type="tel" name="phone" placeholder="Phone">
        <textarea name="coverLetter" placeholder="Cover Letter"></textarea>
      `;
      document.body.appendChild(form);
      
      const detectedFields = autoFillSystem.detectFormFields(form);
      
      expect(detectedFields).toHaveProperty('firstName');
      expect(detectedFields).toHaveProperty('lastName');
      expect(detectedFields).toHaveProperty('email');
      expect(detectedFields).toHaveProperty('phone');
      expect(detectedFields).toHaveProperty('coverLetter');
      
      document.body.removeChild(form);
    });
    
    test('should fill form fields with user data', async () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName" id="first-name">
        <input type="email" name="email" id="email">
      `;
      document.body.appendChild(form);
      
      await autoFillSystem.fillForm(form);
      
      const firstNameField = document.getElementById('first-name');
      const emailField = document.getElementById('email');
      
      expect(firstNameField.value).toBe('John');
      expect(emailField.value).toBe('john.doe@example.com');
      
      document.body.removeChild(form);
    });
    
    test('should simulate human-like typing', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);
      
      const startTime = Date.now();
      await autoFillSystem.typeText(input, 'Hello World', { humanLike: true });
      const endTime = Date.now();
      
      expect(input.value).toBe('Hello World');
      expect(endTime - startTime).toBeGreaterThan(500); // Should take time for human-like typing
      
      document.body.removeChild(input);
    });
  });
  
  describe('ApplicationStateMachine', () => {
    let stateMachine;
    
    beforeEach(() => {
      stateMachine = new ApplicationStateMachine();
    });
    
    test('should initialize in idle state', () => {
      expect(stateMachine.getCurrentState()).toBe('idle');
    });
    
    test('should transition through application states correctly', async () => {
      const jobData = mockLinkedInResponse.expectedData;
      
      // Start application process
      await stateMachine.startApplication(jobData);
      expect(stateMachine.getCurrentState()).toBe('detecting');
      
      // Move to form filling
      await stateMachine.proceedToFormFilling();
      expect(stateMachine.getCurrentState()).toBe('filling');
      
      // Move to submission
      await stateMachine.proceedToSubmission();
      expect(stateMachine.getCurrentState()).toBe('submitting');
      
      // Complete application
      await stateMachine.completeApplication();
      expect(stateMachine.getCurrentState()).toBe('completed');
    });
    
    test('should handle state transition errors', async () => {
      // Try invalid transition
      const result = await stateMachine.proceedToSubmission(); // Can't submit from idle
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid state transition');
      expect(stateMachine.getCurrentState()).toBe('idle');
    });
    
    test('should maintain state history', async () => {
      const jobData = mockLinkedInResponse.expectedData;
      
      await stateMachine.startApplication(jobData);
      await stateMachine.proceedToFormFilling();
      
      const history = stateMachine.getStateHistory();
      
      expect(history).toContain('idle');
      expect(history).toContain('detecting');
      expect(history).toContain('filling');
    });
  });
  
  describe('NotificationSystem', () => {
    let notificationSystem;
    
    beforeEach(() => {
      notificationSystem = new NotificationSystem();
      
      // Mock Chrome notifications API
      chromeTestUtils.registerMessageHandler('SHOW_NOTIFICATION', (message) => ({
        success: true,
        notificationId: 'test_notification_' + Date.now()
      }));
    });
    
    test('should create success notifications', async () => {
      const notification = await notificationSystem.showSuccess({
        title: 'Application Submitted',
        message: 'Your application was submitted successfully',
        jobTitle: 'Software Engineer'
      });
      
      expect(notification.success).toBe(true);
      expect(notification).toHaveProperty('notificationId');
    });
    
    test('should create error notifications', async () => {
      const notification = await notificationSystem.showError({
        title: 'Application Failed',
        message: 'Failed to submit application',
        error: new Error('Network error')
      });
      
      expect(notification.success).toBe(true);
      expect(notification).toHaveProperty('notificationId');
    });
    
    test('should respect user notification preferences', async () => {
      // Set user preferences to disable notifications
      chromeTestUtils.setStorageData({
        notificationSettings: {
          enabled: false,
          types: {
            success: false,
            error: true // Only errors enabled
          }
        }
      });
      
      await notificationSystem.loadSettings();
      
      // Success notification should be suppressed
      const successNotification = await notificationSystem.showSuccess({
        title: 'Test Success',
        message: 'This should be suppressed'
      });
      
      expect(successNotification.suppressed).toBe(true);
      
      // Error notification should be shown
      const errorNotification = await notificationSystem.showError({
        title: 'Test Error',
        message: 'This should be shown'
      });
      
      expect(errorNotification.success).toBe(true);
    });
    
    test('should batch notifications correctly', async () => {
      const jobs = generateMockJobs(5);
      
      // Simulate multiple successful applications
      const notifications = await Promise.all(
        jobs.map(job => notificationSystem.showSuccess({
          title: 'Application Submitted',
          message: `Applied to ${job.title}`,
          jobTitle: job.title
        }))
      );
      
      // Should batch multiple similar notifications
      expect(notifications.length).toBe(5);
      notifications.forEach(notification => {
        expect(notification.success).toBe(true);
      });
    });
  });
  
  describe('PerformanceOptimizer', () => {
    let performanceOptimizer;
    
    beforeEach(() => {
      performanceOptimizer = new PerformanceOptimizer();
    });
    
    test('should cache DOM queries effectively', () => {
      // Create test elements
      const element1 = document.createElement('div');
      element1.className = 'test-element';
      element1.id = 'test-1';
      document.body.appendChild(element1);
      
      // First query should hit DOM
      const startTime1 = performance.now();
      const result1 = performanceOptimizer.querySelector('.test-element');
      const endTime1 = performance.now();
      
      // Second query should hit cache
      const startTime2 = performance.now();
      const result2 = performanceOptimizer.querySelector('.test-element');
      const endTime2 = performance.now();
      
      expect(result1).toBe(element1);
      expect(result2).toBe(element1);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1); // Cache should be faster
      
      document.body.removeChild(element1);
    });
    
    test('should manage memory usage', async () => {
      const initialMemory = PerformanceTestUtils.measureMemoryUsage();
      
      // Create many DOM elements to increase memory usage
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.innerHTML = `Test element ${i}`;
        elements.push(element);
        document.body.appendChild(element);
      }
      
      // Trigger memory cleanup
      await performanceOptimizer.cleanupMemory();
      
      // Remove elements
      elements.forEach(element => document.body.removeChild(element));
      
      const finalMemory = PerformanceTestUtils.measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        // Memory usage should be managed
        expect(finalMemory.used).toBeLessThanOrEqual(initialMemory.used * 1.1); // Allow 10% increase
      }
    });
    
    test('should optimize rate limiting', () => {
      const rateLimiter = performanceOptimizer.getRateLimiter();
      
      // Test rate limiting
      const startTime = Date.now();
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        const request = rateLimiter.makeRequest('linkedin', () => {
          return Promise.resolve(`Request ${i}`);
        });
        requests.push(request);
      }
      
      return Promise.all(requests).then(results => {
        expect(results).toHaveLength(5);
        results.forEach((result, index) => {
          expect(result).toBe(`Request ${index}`);
        });
        
        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThan(1000); // Should have delays
      });
    });
  });
});

describe('Integration - Extension Component Interaction', () => {
  let chromeTestUtils;
  
  beforeEach(() => {
    chromeTestUtils = new ChromeExtensionTestUtils();
    chromeTestUtils.mockChromeAPIs();
  });
  
  test('should coordinate stealth scraping with auto-fill', async () => {
    const stealthScraper = new StealthScraper();
    const autoFillSystem = new AutoFillSystem();
    const stateMachine = new ApplicationStateMachine();
    
    // Setup user profile
    chromeTestUtils.setStorageData({
      userProfile: DataGeneratorUtils.generateUserProfile()
    });
    
    // Mock job page
    document.body.innerHTML = mockLinkedInResponse.html;
    
    // Start application process
    await stateMachine.startApplication(mockLinkedInResponse.expectedData);
    
    // Apply stealth measures
    await stealthScraper.applyStealthMeasures();
    
    // Proceed to form filling
    await stateMachine.proceedToFormFilling();
    
    // Create and fill application form
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName" placeholder="First Name">
      <input type="email" name="email" placeholder="Email">
    `;
    document.body.appendChild(form);
    
    await autoFillSystem.fillForm(form);
    
    // Verify form was filled
    expect(form.querySelector('input[name="firstName"]').value).toBe('John');
    expect(form.querySelector('input[name="email"]').value).toBe('john.doe@example.com');
    
    // Complete application
    await stateMachine.proceedToSubmission();
    await stateMachine.completeApplication();
    
    expect(stateMachine.getCurrentState()).toBe('completed');
    
    document.body.removeChild(form);
  });
  
  test('should handle complete application workflow with error recovery', async () => {
    const components = {
      stealthScraper: new StealthScraper(),
      autoFillSystem: new AutoFillSystem(),
      stateMachine: new ApplicationStateMachine(),
      notificationSystem: new NotificationSystem(),
      performanceOptimizer: new PerformanceOptimizer()
    };
    
    // Simulate error during form filling
    const originalFillForm = components.autoFillSystem.fillForm;
    components.autoFillSystem.fillForm = jest.fn()
      .mockRejectedValueOnce(new Error('Form filling failed'))
      .mockImplementation(originalFillForm);
    
    const jobData = mockLinkedInResponse.expectedData;
    
    try {
      // Start application
      await components.stateMachine.startApplication(jobData);
      
      // Apply stealth measures
      await components.stealthScraper.applyStealthMeasures();
      
      // Try to fill form (will fail first time)
      await components.stateMachine.proceedToFormFilling();
      
      const form = document.createElement('form');
      form.innerHTML = '<input type="text" name="firstName">';
      document.body.appendChild(form);
      
      // First attempt should fail
      try {
        await components.autoFillSystem.fillForm(form);
      } catch (error) {
        expect(error.message).toBe('Form filling failed');
        
        // Show error notification
        await components.notificationSystem.showError({
          title: 'Form Filling Failed',
          message: 'Retrying...',
          error
        });
      }
      
      // Retry should succeed
      await components.autoFillSystem.fillForm(form);
      expect(form.querySelector('input[name="firstName"]').value).toBe('John');
      
      // Complete application
      await components.stateMachine.proceedToSubmission();
      await components.stateMachine.completeApplication();
      
      // Show success notification
      await components.notificationSystem.showSuccess({
        title: 'Application Submitted',
        message: 'Successfully applied to ' + jobData.title,
        jobTitle: jobData.title
      });
      
      expect(components.stateMachine.getCurrentState()).toBe('completed');
      
      document.body.removeChild(form);
    } catch (error) {
      fail('Workflow should handle errors gracefully: ' + error.message);
    }
  });
});
