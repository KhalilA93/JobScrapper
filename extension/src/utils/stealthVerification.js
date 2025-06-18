// Stealth System Verification Script
// Tests all stealth components to ensure they work correctly

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils, StealthInteractions, StealthRateLimit } from './stealthUtils.js';
import { AdvancedStealth } from './advancedStealth.js';
import { JobSiteStealth } from './jobSiteStealth.js';
import { formFiller } from './formFiller.js';

class StealthSystemVerifier {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  // Run all verification tests
  async runAllTests() {
    console.log('🧪 Starting Stealth System Verification...');
    
    const tests = [
      this.testStealthScraper,
      this.testStealthUtils,
      this.testStealthInteractions,
      this.testAdvancedStealth,
      this.testJobSiteStealth,
      this.testFormFiller,
      this.testRateLimit
    ];
    
    for (const test of tests) {
      try {
        await test.call(this);
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error);
        this.testResults.push({
          test: test.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    this.reportResults();
    return this.testResults;
  }

  // Test basic StealthScraper functionality
  async testStealthScraper() {
    console.log('📝 Testing StealthScraper...');
    
    const stealth = new StealthScraper({
      minActionDelay: 100,
      maxActionDelay: 200,
      maxRequestsPerMinute: 60
    });
    
    // Test random delay
    const start = Date.now();
    await stealth.randomDelay(100, 200);
    const duration = Date.now() - start;
    
    if (duration < 100 || duration > 300) {
      throw new Error(`Random delay out of range: ${duration}ms`);
    }
    
    // Test user agent rotation
    const ua1 = stealth.getNextUserAgent();
    const ua2 = stealth.getNextUserAgent();
    
    if (ua1 === ua2) {
      console.warn('User agents not rotating properly');
    }
    
    // Test header generation
    const headers = stealth.generateHeaders();
    if (!headers['User-Agent'] || !headers['Accept']) {
      throw new Error('Headers missing required fields');
    }
    
    // Test rate limiting
    const rateLimitOk = await stealth.checkRateLimit();
    if (!rateLimitOk) {
      throw new Error('Rate limit check failed');
    }
    
    this.testResults.push({
      test: 'StealthScraper',
      passed: true,
      details: {
        delayTested: true,
        userAgentRotation: ua1 !== ua2,
        headersGenerated: true,
        rateLimitWorking: true
      }
    });
    
    console.log('✅ StealthScraper tests passed');
  }

  // Test StealthUtils functionality
  async testStealthUtils() {
    console.log('📝 Testing StealthUtils...');
    
    // Test different delay types
    const microStart = Date.now();
    await StealthUtils.microDelay();
    const microDuration = Date.now() - microStart;
    
    if (microDuration < 40 || microDuration > 250) {
      throw new Error(`Micro delay out of range: ${microDuration}ms`);
    }
    
    const actionStart = Date.now();
    await StealthUtils.actionDelay();
    const actionDuration = Date.now() - actionStart;
    
    if (actionDuration < 400 || actionDuration > 2000) {
      throw new Error(`Action delay out of range: ${actionDuration}ms`);
    }
    
    // Test reading delay
    const readingStart = Date.now();
    await StealthUtils.readingDelay(100);
    const readingDuration = Date.now() - readingStart;
    
    if (readingDuration < 50) {
      throw new Error(`Reading delay too short: ${readingDuration}ms`);
    }
    
    this.testResults.push({
      test: 'StealthUtils',
      passed: true,
      details: {
        microDelay: microDuration,
        actionDelay: actionDuration,
        readingDelay: readingDuration
      }
    });
    
    console.log('✅ StealthUtils tests passed');
  }

  // Test StealthInteractions functionality
  async testStealthInteractions() {
    console.log('📝 Testing StealthInteractions...');
    
    // Create test element
    const testElement = document.createElement('button');
    testElement.textContent = 'Test Button';
    testElement.style.position = 'absolute';
    testElement.style.top = '100px';
    testElement.style.left = '100px';
    testElement.style.padding = '10px';
    document.body.appendChild(testElement);
    
    try {
      // Test natural click (should not throw error)
      await StealthInteractions.naturalClick(testElement);
      
      // Test quick click
      await StealthInteractions.quickClick(testElement);
      
      // Test form filling
      const testForm = {
        'input[type="text"]': 'test value'
      };
      
      // Create test input
      const testInput = document.createElement('input');
      testInput.type = 'text';
      testInput.name = 'test';
      document.body.appendChild(testInput);
      
      await StealthInteractions.fillForm(testForm);
      
      // Clean up
      document.body.removeChild(testElement);
      document.body.removeChild(testInput);
      
      this.testResults.push({
        test: 'StealthInteractions',
        passed: true,
        details: {
          naturalClick: true,
          quickClick: true,
          formFilling: true
        }
      });
      
      console.log('✅ StealthInteractions tests passed');
      
    } catch (error) {
      // Clean up on error
      if (testElement.parentNode) {
        document.body.removeChild(testElement);
      }
      throw error;
    }
  }

  // Test AdvancedStealth functionality
  async testAdvancedStealth() {
    console.log('📝 Testing AdvancedStealth...');
    
    const advancedStealth = new AdvancedStealth({
      randomizeFingerprint: true,
      enableIdleSimulation: false // Skip idle simulation for testing
    });
    
    // Test fingerprint generation
    const fingerprint = advancedStealth.generateFingerprint();
    
    if (!fingerprint.browser || !fingerprint.platform || !fingerprint.screen) {
      throw new Error('Fingerprint missing required fields');
    }
    
    // Test behavior patterns
    const behaviorPatterns = advancedStealth.behaviorPatterns;
    
    if (!behaviorPatterns.patterns.jobSeekerBehavior) {
      throw new Error('Job seeker behavior pattern missing');
    }
    
    // Test detection avoider
    const detectionAvoider = advancedStealth.detectionAvoider;
    const detected = await detectionAvoider.detectBotDetection();
    
    this.testResults.push({
      test: 'AdvancedStealth',
      passed: true,
      details: {
        fingerprintGenerated: true,
        behaviorPatternsAvailable: true,
        detectionAvoiderWorking: true,
        botDetected: detected
      }
    });
    
    console.log('✅ AdvancedStealth tests passed');
  }

  // Test JobSiteStealth functionality
  async testJobSiteStealth() {
    console.log('📝 Testing JobSiteStealth...');
    
    const jobSiteStealth = new JobSiteStealth();
    
    // Test site handler retrieval
    const linkedinHandler = jobSiteStealth.getSiteHandler('linkedin');
    const indeedHandler = jobSiteStealth.getSiteHandler('indeed');
    const genericHandler = jobSiteStealth.getSiteHandler('unknown');
    
    if (!linkedinHandler || !indeedHandler || !genericHandler) {
      throw new Error('Site handlers not properly initialized');
    }
    
    // Test that handlers have required methods
    const requiredMethods = ['applyToJob', 'browseJobs'];
    
    for (const method of requiredMethods) {
      if (typeof linkedinHandler[method] !== 'function') {
        throw new Error(`LinkedIn handler missing ${method} method`);
      }
      if (typeof indeedHandler[method] !== 'function') {
        throw new Error(`Indeed handler missing ${method} method`);
      }
      if (typeof genericHandler[method] !== 'function') {
        throw new Error(`Generic handler missing ${method} method`);
      }
    }
    
    this.testResults.push({
      test: 'JobSiteStealth',
      passed: true,
      details: {
        linkedinHandler: true,
        indeedHandler: true,
        genericHandler: true,
        requiredMethods: true
      }
    });
    
    console.log('✅ JobSiteStealth tests passed');
  }

  // Test FormFiller functionality
  async testFormFiller() {
    console.log('📝 Testing FormFiller...');
    
    // Check that form filler has required site handlers
    const requiredHandlers = ['linkedin', 'indeed', 'generic'];
    
    for (const handler of requiredHandlers) {
      if (!formFiller[handler]) {
        throw new Error(`Form filler missing ${handler} handler`);
      }
      
      if (typeof formFiller[handler].fillForm !== 'function') {
        throw new Error(`${handler} handler missing fillForm method`);
      }
    }
    
    // Test form filling methods exist
    const linkedinHandler = formFiller.linkedin;
    const requiredMethods = ['fillForm', 'fillFieldsStealth', 'fillFieldStealth'];
    
    for (const method of requiredMethods) {
      if (typeof linkedinHandler[method] !== 'function') {
        throw new Error(`LinkedIn form filler missing ${method} method`);
      }
    }
    
    this.testResults.push({
      test: 'FormFiller',
      passed: true,
      details: {
        linkedinHandler: true,
        indeedHandler: true,
        genericHandler: true,
        requiredMethods: true
      }
    });
    
    console.log('✅ FormFiller tests passed');
  }

  // Test RateLimit functionality
  async testRateLimit() {
    console.log('📝 Testing RateLimit...');
    
    // Test that rate limit functions exist
    const rateLimitFunctions = [
      'jobApplicationDelay',
      'searchPageDelay',
      'profileViewDelay',
      'bulkOperationDelay'
    ];
    
    for (const func of rateLimitFunctions) {
      if (typeof StealthRateLimit[func] !== 'function') {
        throw new Error(`Rate limit missing ${func} function`);
      }
    }
    
    // Test bulk operation delay calculation
    const delay1 = StealthRateLimit.bulkOperationDelay(1);
    const delay2 = StealthRateLimit.bulkOperationDelay(2);
    
    // Both should return promises
    if (!(delay1 instanceof Promise) || !(delay2 instanceof Promise)) {
      throw new Error('Rate limit functions should return promises');
    }
    
    this.testResults.push({
      test: 'RateLimit',
      passed: true,
      details: {
        allFunctionsExist: true,
        returnsPromises: true
      }
    });
    
    console.log('✅ RateLimit tests passed');
  }

  // Report test results
  reportResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Stealth System Verification Results:');
    console.log('==========================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(`Duration: ${duration}ms`);
    console.log('==========================================\n');
    
    // Detail results
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      
      if (!result.passed) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    });
    
    if (failedTests === 0) {
      console.log('\n🎉 All stealth system tests passed! System is ready for use.');
    } else {
      console.log(`\n⚠️ ${failedTests} test(s) failed. Please check the implementation.`);
    }
  }
}

// Run verification if script is executed directly
if (typeof window !== 'undefined' && window.location) {
  const verifier = new StealthSystemVerifier();
  verifier.runAllTests().then(results => {
    console.log('Verification completed');
  }).catch(error => {
    console.error('Verification failed:', error);
  });
}

export { StealthSystemVerifier };
