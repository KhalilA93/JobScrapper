// Auto-Fill System Usage Examples
// Demonstrates how to use the core auto-fill functionality

import { AutoFillSystem } from './autoFillSystem.js';

/**
 * Basic Auto-Fill Usage Example
 */
async function basicAutoFillExample() {
  // Initialize auto-fill system
  const autoFill = new AutoFillSystem({
    enableStealth: true,
    validateFields: true,
    skipFilledFields: true,
    fillDelay: 150
  });

  // User data to fill
  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    coverLetter: 'I am excited to apply for this position and believe my skills...',
    experience: '5 years',
    expectedSalary: '$75,000',
    location: 'New York, NY',
    resumeFile: { name: 'john_doe_resume.pdf' }
  };

  try {
    // Execute auto-fill
    const results = await autoFill.autoFill(userData);
    
    console.log('Auto-fill Results:');
    console.log(`✅ Filled: ${results.filled.length} fields`);
    console.log(`⏭️  Skipped: ${results.skipped.length} fields`);
    console.log(`❌ Failed: ${results.failed.length} fields`);
    
    return results;
  } catch (error) {
    console.error('Auto-fill failed:', error);
  }
}

/**
 * LinkedIn Easy Apply Example
 */
async function linkedinEasyApplyExample() {
  const autoFill = new AutoFillSystem({
    enableStealth: true,
    validateFields: true,
    fillDelay: 200,
    scrollToField: true
  });

  const userData = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '(555) 123-4567',
    coverLetter: 'Dear Hiring Manager,\n\nI am writing to express my strong interest...',
    yearsExperience: '7',
    expectedSalary: 'Negotiable'
  };

  // Wait for LinkedIn Easy Apply modal to load
  await waitForElement('.jobs-easy-apply-modal');

  // Fill the application form
  const results = await autoFill.autoFill(userData, {
    maxRetries: 2,
    fillDelay: 300 // Slower for LinkedIn
  });

  // Handle LinkedIn-specific post-fill actions
  if (results.filled.length > 0) {
    console.log('LinkedIn form filled successfully');
    
    // Look for continue/submit buttons
    const continueBtn = document.querySelector('[data-control-name="continue_unify"]');
    const submitBtn = document.querySelector('[data-control-name="submit_unify"]');
    
    if (continueBtn) {
      console.log('Continue button found - multi-step application');
    } else if (submitBtn) {
      console.log('Submit button found - ready to submit');
    }
  }

  return results;
}

/**
 * Indeed Application Example
 */
async function indeedApplicationExample() {
  const autoFill = new AutoFillSystem({
    enableStealth: true,
    validateFields: true,
    skipFilledFields: false // Indeed sometimes pre-fills incorrectly
  });

  const userData = {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    phone: '555-987-6543',
    coverLetter: 'I am enthusiastic about this opportunity...',
    experience: '3-5 years'
  };

  // Indeed-specific field handling
  const results = await autoFill.autoFill(userData, {
    fillDelay: 250,
    customFieldMappings: {
      'applicant.name': `${userData.firstName} ${userData.lastName}`,
      'applicant.emailAddress': userData.email,
      'applicant.phoneNumber': userData.phone
    }
  });

  return results;
}

/**
 * Generic Job Site Example with Custom Mapping
 */
async function genericJobSiteExample() {
  const autoFill = new AutoFillSystem({
    enableStealth: false, // Faster fill for testing
    validateFields: true
  });

  const userData = {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@example.com',
    phone: '555-456-7890',
    coverLetter: 'Dear Hiring Team...',
    location: 'San Francisco, CA',
    yearsExperience: 4,
    expectedSalary: '$80,000-$90,000'
  };

  // Custom field detection for specific site
  const customDetection = {
    // Override detection for specific selectors
    '#applicant_first_name': { fieldType: 'firstName', confidence: 100 },
    '#applicant_last_name': { fieldType: 'lastName', confidence: 100 },
    '.email-input': { fieldType: 'email', confidence: 100 },
    'textarea[name="message"]': { fieldType: 'coverLetter', confidence: 90 }
  };

  // Apply custom detection before auto-fill
  await applyCustomDetection(customDetection);
  
  const results = await autoFill.autoFill(userData);
  return results;
}

/**
 * Advanced Auto-Fill with Form Analysis
 */
async function advancedAutoFillExample() {
  const autoFill = new AutoFillSystem({
    enableStealth: true,
    validateFields: true,
    maxRetries: 3
  });

  // Analyze form before filling
  const formAnalysis = await analyzeForm();
  console.log('Form Analysis:', formAnalysis);

  const userData = {
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@example.com',
    phone: '+1 (555) 234-5678',
    coverLetter: generateCoverLetter('Software Engineer', 'Tech Company'),
    experience: '6 years',
    skills: ['JavaScript', 'React', 'Node.js'],
    education: 'Bachelor\'s in Computer Science'
  };

  // Fill form with progress tracking
  const results = await autoFillWithProgress(autoFill, userData);
  
  // Post-fill validation and corrections
  if (results.failed.length > 0) {
    console.log('Attempting to correct failed fields...');
    const corrections = await correctFailedFields(autoFill, results.failed, userData);
    results.corrected = corrections;
  }

  return results;
}

/**
 * Batch Auto-Fill for Multiple Forms
 */
async function batchAutoFillExample() {
  const autoFill = new AutoFillSystem({
    enableStealth: true,
    fillDelay: 100
  });

  const userData = {
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.anderson@example.com',
    phone: '555-321-9876',
    coverLetter: 'I am writing to apply...'
  };

  // Find all forms on page
  const forms = document.querySelectorAll('form');
  const results = [];

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    console.log(`Processing form ${i + 1}/${forms.length}`);

    try {
      // Set context to specific form
      const formResults = await autoFillInContext(autoFill, userData, form);
      results.push({
        formIndex: i,
        formId: form.id || `form-${i}`,
        ...formResults
      });

      // Delay between forms
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Form ${i + 1} failed:`, error);
      results.push({
        formIndex: i,
        error: error.message
      });
    }
  }

  return results;
}

// Helper Functions

/**
 * Wait for element to appear
 */
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

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
}

/**
 * Apply custom field detection rules
 */
async function applyCustomDetection(customRules) {
  for (const [selector, fieldInfo] of Object.entries(customRules)) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.dataset.autoFillType = fieldInfo.fieldType;
      element.dataset.autoFillConfidence = fieldInfo.confidence;
    });
  }
}

/**
 * Analyze form structure and fields
 */
async function analyzeForm() {
  const forms = document.querySelectorAll('form');
  const analysis = {
    formCount: forms.length,
    totalFields: 0,
    fieldTypes: {},
    requiredFields: 0,
    hasFileUpload: false
  };

  forms.forEach(form => {
    const fields = form.querySelectorAll('input, textarea, select');
    analysis.totalFields += fields.length;

    fields.forEach(field => {
      const type = field.type || field.tagName.toLowerCase();
      analysis.fieldTypes[type] = (analysis.fieldTypes[type] || 0) + 1;

      if (field.required) analysis.requiredFields++;
      if (type === 'file') analysis.hasFileUpload = true;
    });
  });

  return analysis;
}

/**
 * Auto-fill with progress tracking
 */
async function autoFillWithProgress(autoFill, userData) {
  const progressCallback = (progress) => {
    console.log(`Fill progress: ${progress.completed}/${progress.total} fields`);
  };

  // Monkey patch to add progress tracking
  const originalFillField = autoFill.fillField;
  let completed = 0;
  let total = 0;

  autoFill.fillField = async function(mapping, options) {
    const result = await originalFillField.call(this, mapping, options);
    completed++;
    progressCallback({ completed, total });
    return result;
  };

  const results = await autoFill.autoFill(userData);
  total = results.filled.length + results.skipped.length + results.failed.length;
  
  return results;
}

/**
 * Correct failed field fills
 */
async function correctFailedFields(autoFill, failedFields, userData) {
  const corrections = [];

  for (const failedField of failedFields) {
    try {
      // Retry with different strategy
      const result = await autoFill.fillField({
        element: failedField.element,
        fieldType: failedField.fieldType,
        value: userData[failedField.fieldType],
        fillMethod: 'direct_fill' // Use direct fill as fallback
      }, {
        validateFields: false // Skip validation for corrections
      });

      corrections.push(result);
    } catch (error) {
      console.error(`Correction failed for ${failedField.fieldType}:`, error);
    }
  }

  return corrections;
}

/**
 * Auto-fill within specific form context
 */
async function autoFillInContext(autoFill, userData, formElement) {
  // Temporarily limit detection to specific form
  const originalQuerySelector = document.querySelectorAll;
  document.querySelectorAll = function(selector) {
    return formElement.querySelectorAll(selector);
  };

  try {
    const results = await autoFill.autoFill(userData);
    return results;
  } finally {
    // Restore original querySelectorAll
    document.querySelectorAll = originalQuerySelector;
  }
}

/**
 * Generate context-aware cover letter
 */
function generateCoverLetter(position, company) {
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${position} position at ${company}. With my background in software development and passion for technology, I believe I would be a valuable addition to your team.

My experience includes:
- Full-stack web development
- Modern JavaScript frameworks
- Agile development methodologies
- Strong problem-solving skills

I am excited about the opportunity to contribute to ${company}'s success and would welcome the chance to discuss how my skills align with your needs.

Thank you for your consideration.

Best regards,
[Your Name]`;
}

// Export examples for use
export {
  basicAutoFillExample,
  linkedinEasyApplyExample,
  indeedApplicationExample,
  genericJobSiteExample,
  advancedAutoFillExample,
  batchAutoFillExample,
  waitForElement,
  analyzeForm
};
