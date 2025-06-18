// Auto-Fill System Testing and Validation
// Comprehensive testing utilities for the auto-fill functionality

import { AutoFillSystem, FieldDetectionStrategies, SmartFieldMapper, FieldValidator } from './autoFillSystem.js';

class AutoFillTester {
  constructor() {
    this.testResults = [];
    this.mockData = this.generateMockData();
  }

  /**
   * Run comprehensive auto-fill tests
   */
  async runAllTests() {
    console.log('🧪 Starting Auto-Fill System Tests...');

    const tests = [
      this.testFieldDetection,
      this.testSmartMapping,
      this.testFieldValidation,
      this.testAutoFillExecution,
      this.testStealthIntegration,
      this.testErrorHandling,
      this.testFormValidation
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

  /**
   * Test field detection strategies
   */
  async testFieldDetection() {
    console.log('📝 Testing Field Detection...');

    const detector = new FieldDetectionStrategies();
    
    // Create test fields
    const testFields = this.createTestFields();
    const detectionResults = [];

    for (const field of testFields) {
      const result = await detector.analyzeField(field.element);
      detectionResults.push({
        expected: field.expectedType,
        detected: result.fieldType,
        confidence: result.confidence,
        correct: result.fieldType === field.expectedType
      });
    }

    // Validate detection accuracy
    const accuracy = detectionResults.filter(r => r.correct).length / detectionResults.length;
    
    if (accuracy < 0.8) {
      throw new Error(`Field detection accuracy too low: ${(accuracy * 100).toFixed(1)}%`);
    }

    this.testResults.push({
      test: 'FieldDetection',
      passed: true,
      details: {
        accuracy: (accuracy * 100).toFixed(1) + '%',
        totalFields: detectionResults.length,
        correctDetections: detectionResults.filter(r => r.correct).length
      }
    });

    // Cleanup test fields
    this.cleanupTestFields(testFields);

    console.log('✅ Field Detection tests passed');
  }

  /**
   * Test smart field mapping
   */
  async testSmartMapping() {
    console.log('📝 Testing Smart Mapping...');

    const mapper = new SmartFieldMapper();
    const userData = this.mockData.userData;

    const testMappings = [
      { fieldType: 'email', expected: userData.email },
      { fieldType: 'firstName', expected: userData.firstName },
      { fieldType: 'lastName', expected: userData.lastName },
      { fieldType: 'fullName', expected: `${userData.firstName} ${userData.lastName}` },
      { fieldType: 'phone', expected: userData.phone }
    ];

    const mappingResults = [];

    for (const testMapping of testMappings) {
      const fieldInfo = { fieldType: testMapping.fieldType };
      const result = await mapper.mapField(fieldInfo, userData);
      
      mappingResults.push({
        fieldType: testMapping.fieldType,
        expected: testMapping.expected,
        mapped: result.value,
        correct: result.value === testMapping.expected
      });
    }

    const accuracy = mappingResults.filter(r => r.correct).length / mappingResults.length;

    if (accuracy !== 1) {
      throw new Error(`Mapping accuracy not 100%: ${(accuracy * 100).toFixed(1)}%`);
    }

    this.testResults.push({
      test: 'SmartMapping',
      passed: true,
      details: {
        accuracy: '100%',
        totalMappings: mappingResults.length
      }
    });

    console.log('✅ Smart Mapping tests passed');
  }

  /**
   * Test field validation
   */
  async testFieldValidation() {
    console.log('📝 Testing Field Validation...');

    const validator = new FieldValidator();
    
    const validationTests = [
      {
        type: 'email',
        value: 'test@example.com',
        expected: true
      },
      {
        type: 'email',
        value: 'invalid-email',
        expected: false
      },
      {
        type: 'tel',
        value: '+1-555-0123',
        expected: true
      },
      {
        type: 'tel',
        value: '123',
        expected: false
      }
    ];

    const validationResults = [];

    for (const test of validationTests) {
      // Create test element
      const element = document.createElement('input');
      element.type = test.type;
      element.value = test.value;
      document.body.appendChild(element);

      const result = await validator.validateField(element, test.value);
      validationResults.push({
        type: test.type,
        value: test.value,
        expected: test.expected,
        actual: result.valid,
        correct: result.valid === test.expected
      });

      document.body.removeChild(element);
    }

    const accuracy = validationResults.filter(r => r.correct).length / validationResults.length;

    if (accuracy !== 1) {
      throw new Error(`Validation accuracy not 100%: ${(accuracy * 100).toFixed(1)}%`);
    }

    this.testResults.push({
      test: 'FieldValidation',
      passed: true,
      details: {
        accuracy: '100%',
        totalTests: validationResults.length
      }
    });

    console.log('✅ Field Validation tests passed');
  }

  /**
   * Test auto-fill execution
   */
  async testAutoFillExecution() {
    console.log('📝 Testing Auto-Fill Execution...');

    const autoFill = new AutoFillSystem({
      enableStealth: false, // Faster for testing
      validateFields: true,
      fillDelay: 10
    });

    // Create test form
    const testForm = this.createTestForm();
    document.body.appendChild(testForm);

    try {
      const results = await autoFill.autoFill(this.mockData.userData);

      // Validate results
      if (results.filled.length === 0) {
        throw new Error('No fields were filled');
      }

      if (results.failed.length > results.filled.length) {
        throw new Error('More fields failed than succeeded');
      }

      // Check if critical fields were filled
      const emailField = testForm.querySelector('input[name="email"]');
      if (!emailField.value) {
        throw new Error('Email field was not filled');
      }

      this.testResults.push({
        test: 'AutoFillExecution',
        passed: true,
        details: {
          filled: results.filled.length,
          skipped: results.skipped.length,
          failed: results.failed.length
        }
      });

    } finally {
      document.body.removeChild(testForm);
    }

    console.log('✅ Auto-Fill Execution tests passed');
  }

  /**
   * Test stealth integration
   */
  async testStealthIntegration() {
    console.log('📝 Testing Stealth Integration...');

    const autoFill = new AutoFillSystem({
      enableStealth: true,
      fillDelay: 50 // Faster for testing
    });

    // Verify stealth instance exists
    if (!autoFill.stealth) {
      throw new Error('Stealth instance not initialized');
    }

    // Test stealth methods exist
    const requiredMethods = ['simulateTyping', 'simulateClick', 'randomDelay'];
    for (const method of requiredMethods) {
      if (typeof autoFill.stealth[method] !== 'function') {
        throw new Error(`Stealth method ${method} not available`);
      }
    }

    this.testResults.push({
      test: 'StealthIntegration',
      passed: true,
      details: {
        stealthEnabled: true,
        methodsAvailable: requiredMethods.length
      }
    });

    console.log('✅ Stealth Integration tests passed');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('📝 Testing Error Handling...');

    const autoFill = new AutoFillSystem({
      enableStealth: false,
      maxRetries: 1
    });

    // Test with invalid data
    const invalidData = {
      email: null,
      firstName: undefined,
      phone: ''
    };

    // Create minimal form
    const testForm = document.createElement('form');
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    testForm.appendChild(emailInput);
    document.body.appendChild(testForm);

    try {
      const results = await autoFill.autoFill(invalidData);
      
      // Should handle null/undefined values gracefully
      if (results.failed.length === 0 && results.filled.length === 0 && results.skipped.length === 0) {
        throw new Error('No error handling - should have skipped or failed gracefully');
      }

      this.testResults.push({
        test: 'ErrorHandling',
        passed: true,
        details: {
          handledGracefully: true,
          failedCount: results.failed.length,
          skippedCount: results.skipped.length
        }
      });

    } finally {
      document.body.removeChild(testForm);
    }

    console.log('✅ Error Handling tests passed');
  }

  /**
   * Test form validation
   */
  async testFormValidation() {
    console.log('📝 Testing Form Validation...');

    const autoFill = new AutoFillSystem({
      validateFields: true,
      enableStealth: false
    });

    // Create form with validation constraints
    const testForm = this.createValidationTestForm();
    document.body.appendChild(testForm);

    try {
      const results = await autoFill.autoFill(this.mockData.userData);

      // Check validation results
      if (results.validated && results.validated.length > 0) {
        const validFields = results.validated.filter(v => v.valid);
        const invalidFields = results.validated.filter(v => !v.valid);

        this.testResults.push({
          test: 'FormValidation',
          passed: true,
          details: {
            totalValidated: results.validated.length,
            validFields: validFields.length,
            invalidFields: invalidFields.length
          }
        });
      } else {
        throw new Error('Form validation not executed');
      }

    } finally {
      document.body.removeChild(testForm);
    }

    console.log('✅ Form Validation tests passed');
  }

  /**
   * Create test fields for detection testing
   */
  createTestFields() {
    const fields = [
      {
        type: 'email',
        name: 'email',
        expectedType: 'email'
      },
      {
        type: 'text',
        name: 'firstName',
        expectedType: 'firstName'
      },
      {
        type: 'text',
        name: 'lastName',
        expectedType: 'lastName'
      },
      {
        type: 'tel',
        name: 'phone',
        expectedType: 'phone'
      },
      {
        type: 'file',
        name: 'resume',
        expectedType: 'file'
      }
    ];

    return fields.map(field => {
      const element = document.createElement('input');
      element.type = field.type;
      element.name = field.name;
      document.body.appendChild(element);
      
      return {
        element,
        expectedType: field.expectedType
      };
    });
  }

  /**
   * Create test form
   */
  createTestForm() {
    const form = document.createElement('form');
    form.id = 'test-form';

    const fields = [
      { type: 'email', name: 'email', placeholder: 'Email Address' },
      { type: 'text', name: 'firstName', placeholder: 'First Name' },
      { type: 'text', name: 'lastName', placeholder: 'Last Name' },
      { type: 'tel', name: 'phone', placeholder: 'Phone Number' },
      { type: 'textarea', name: 'coverLetter', placeholder: 'Cover Letter' }
    ];

    fields.forEach(field => {
      const element = field.type === 'textarea' 
        ? document.createElement('textarea')
        : document.createElement('input');
      
      if (field.type !== 'textarea') {
        element.type = field.type;
      }
      
      element.name = field.name;
      element.placeholder = field.placeholder;
      
      form.appendChild(element);
    });

    return form;
  }

  /**
   * Create validation test form
   */
  createValidationTestForm() {
    const form = document.createElement('form');
    
    // Required email field
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.required = true;
    form.appendChild(emailInput);

    // Required text field
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'firstName';
    nameInput.required = true;
    form.appendChild(nameInput);

    // Number field with constraints
    const salaryInput = document.createElement('input');
    salaryInput.type = 'number';
    salaryInput.name = 'salary';
    salaryInput.min = '30000';
    salaryInput.max = '200000';
    form.appendChild(salaryInput);

    return form;
  }

  /**
   * Cleanup test fields
   */
  cleanupTestFields(testFields) {
    testFields.forEach(field => {
      if (field.element.parentNode) {
        field.element.parentNode.removeChild(field.element);
      }
    });
  }

  /**
   * Generate mock data for testing
   */
  generateMockData() {
    return {
      userData: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        phone: '+1-555-0123',
        coverLetter: 'This is a test cover letter for auto-fill testing.',
        experience: '3 years',
        expectedSalary: '65000',
        location: 'Test City, TC'
      }
    };
  }

  /**
   * Report test results
   */
  reportResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('\n📊 Auto-Fill System Test Results:');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log('=====================================\n');

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
      console.log('\n🎉 All auto-fill system tests passed!');
    } else {
      console.log(`\n⚠️ ${failedTests} test(s) failed. Please check the implementation.`);
    }
  }
}

/**
 * Performance testing for auto-fill system
 */
class AutoFillPerformanceTester {
  constructor() {
    this.performanceResults = [];
  }

  /**
   * Test auto-fill performance with different form sizes
   */
  async testPerformance() {
    console.log('⚡ Starting Auto-Fill Performance Tests...');

    const testCases = [
      { name: 'Small Form', fieldCount: 5 },
      { name: 'Medium Form', fieldCount: 15 },
      { name: 'Large Form', fieldCount: 30 }
    ];

    for (const testCase of testCases) {
      const performanceResult = await this.measureAutoFillPerformance(testCase);
      this.performanceResults.push(performanceResult);
    }

    this.reportPerformanceResults();
    return this.performanceResults;
  }

  /**
   * Measure auto-fill performance for specific form size
   */
  async measureAutoFillPerformance(testCase) {
    const autoFill = new AutoFillSystem({
      enableStealth: false,
      fillDelay: 0
    });

    // Create test form
    const testForm = this.createPerformanceTestForm(testCase.fieldCount);
    document.body.appendChild(testForm);

    const userData = {
      firstName: 'Performance',
      lastName: 'Test',
      email: 'performance@test.com',
      phone: '555-0123'
    };

    try {
      const startTime = performance.now();
      const results = await autoFill.autoFill(userData);
      const endTime = performance.now();

      const duration = endTime - startTime;

      return {
        testCase: testCase.name,
        fieldCount: testCase.fieldCount,
        duration: Math.round(duration),
        fieldsPerSecond: Math.round((results.filled.length / duration) * 1000),
        successRate: results.filled.length / (results.filled.length + results.failed.length)
      };

    } finally {
      document.body.removeChild(testForm);
    }
  }

  /**
   * Create performance test form
   */
  createPerformanceTestForm(fieldCount) {
    const form = document.createElement('form');
    
    const fieldTypes = ['text', 'email', 'tel', 'textarea'];
    const fieldNames = ['firstName', 'lastName', 'email', 'phone', 'message'];

    for (let i = 0; i < fieldCount; i++) {
      const fieldType = fieldTypes[i % fieldTypes.length];
      const fieldName = fieldNames[i % fieldNames.length] + (i > 4 ? i : '');

      const element = fieldType === 'textarea' 
        ? document.createElement('textarea')
        : document.createElement('input');
      
      if (fieldType !== 'textarea') {
        element.type = fieldType;
      }
      
      element.name = fieldName;
      form.appendChild(element);
    }

    return form;
  }

  /**
   * Report performance results
   */
  reportPerformanceResults() {
    console.log('\n⚡ Auto-Fill Performance Results:');
    console.log('=================================');
    
    this.performanceResults.forEach(result => {
      console.log(`${result.testCase}:`);
      console.log(`  Fields: ${result.fieldCount}`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Speed: ${result.fieldsPerSecond} fields/second`);
      console.log(`  Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
      console.log('');
    });
  }
}

// Auto-run tests if script is executed directly
if (typeof window !== 'undefined' && window.location) {
  const tester = new AutoFillTester();
  const performanceTester = new AutoFillPerformanceTester();
  
  // Run tests after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await tester.runAllTests();
      await performanceTester.testPerformance();
    });
  } else {
    tester.runAllTests().then(() => {
      return performanceTester.testPerformance();
    }).catch(error => {
      console.error('Testing failed:', error);
    });
  }
}

export { AutoFillTester, AutoFillPerformanceTester };
