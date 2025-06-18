// Comprehensive Error Handling Usage Examples
// Demonstrates practical implementation of error handling patterns

import { errorHandler } from './errorHandler.js';
import { contentScriptErrorHandler, backgroundScriptErrorHandler } from './errorHandlingIntegration.js';

/**
 * NETWORK FAILURE RECOVERY EXAMPLES
 */

// Example 1: API Call with Exponential Backoff
async function apiCallWithRecovery() {
  try {
    const result = await errorHandler.withNetworkRecovery(async () => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'software engineer' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    }, {
      endpoint: '/api/jobs',
      method: 'POST',
      maxRetries: 5
    });
    
    console.log('✅ API call successful:', result);
    return result;
  } catch (error) {
    console.error('❌ API call failed after retries:', error);
    // Fallback to cached data or default response
    return await getCachedJobs();
  }
}

// Example 2: Chrome Extension Message Passing with Recovery
async function sendMessageWithRecovery(message) {
  return await errorHandler.withNetworkRecovery(async () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, {
    operation: 'chrome_message',
    messageType: message.type
  });
}

// Example 3: File Upload with Network Recovery
async function uploadResumeWithRecovery(file, jobId) {
  return await errorHandler.withNetworkRecovery(async () => {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobId', jobId);
    
    const response = await fetch('/api/upload-resume', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return await response.json();
  }, {
    endpoint: '/api/upload-resume',
    fileSize: file.size,
    fileName: file.name
  });
}

/**
 * DOM ELEMENT GRACEFUL DEGRADATION EXAMPLES
 */

// Example 4: Safe Job Data Extraction
async function extractJobDataSafely() {
  const jobData = await contentScriptErrorHandler.extractJobDataSafely(async () => {
    // Primary extraction strategy
    const primaryData = {
      title: document.querySelector('h1[data-test="job-title"]')?.textContent?.trim(),
      company: document.querySelector('[data-test="company-name"]')?.textContent?.trim(),
      location: document.querySelector('[data-test="job-location"]')?.textContent?.trim(),
      description: document.querySelector('[data-test="job-description"]')?.innerHTML,
      salary: extractSalaryInfo(),
      requirements: extractRequirements()
    };
    
    // Validate extracted data
    if (!primaryData.title || !primaryData.company) {
      throw new Error('Essential job data missing');
    }
    
    return primaryData;
  }, {
    operation: 'extract_job_data',
    selector: '[data-test="job-container"]',
    platform: getCurrentPlatform()
  });
  
  return jobData;
}

// Example 5: Safe Form Filling with Fallback Strategies
async function fillApplicationFormSafely(applicationData) {
  return await contentScriptErrorHandler.fillFormSafely(
    async (form, data) => {
      const fields = [
        { selector: '#firstName', value: data.firstName, required: true },
        { selector: '#lastName', value: data.lastName, required: true },
        { selector: '#email', value: data.email, required: true },
        { selector: '#phone', value: data.phone, required: false },
        { selector: '#coverLetter', value: data.coverLetter, required: false }
      ];
      
      const results = {};
      
      for (const field of fields) {
        try {
          const element = form.querySelector(field.selector);
          if (!element) {
            if (field.required) {
              throw new Error(`Required field not found: ${field.selector}`);
            }
            continue;
          }
          
          // Simulate human-like typing
          await simulateTyping(element, field.value);
          results[field.selector] = 'success';
        } catch (error) {
          results[field.selector] = 'failed';
          if (field.required) {
            throw error;
          }
        }
      }
      
      return results;
    },
    applicationData,
    {
      formSelector: '#application-form',
      platform: getCurrentPlatform(),
      jobId: getCurrentJobId()
    }
  );
}

// Example 6: Safe Button Clicking with Verification
async function submitApplicationSafely(platform) {
  const submitButton = getSubmitButtonSelector(platform);
  
  return await contentScriptErrorHandler.clickButtonSafely(submitButton, {
    platform,
    jobId: getCurrentJobId(),
    operation: 'submit_application',
    originalUrl: window.location.href,
    verificationStrategy: 'url_change_and_success_message'
  });
}

/**
 * APPLICATION SUBMISSION RETRY LOGIC EXAMPLES
 */

// Example 7: Complete Application Process with Recovery
async function completeApplicationWithRecovery(applicationData) {
  return await errorHandler.withSubmissionRecovery(
    async (data) => {
      // Step 1: Fill basic information
      await fillBasicInformation(data);
      
      // Step 2: Upload documents
      if (data.resume) {
        await uploadDocument(data.resume, 'resume');
      }
      if (data.coverLetter) {
        await uploadDocument(data.coverLetter, 'cover_letter');
      }
      
      // Step 3: Answer screening questions
      if (data.screeningAnswers) {
        await answerScreeningQuestions(data.screeningAnswers);
      }
      
      // Step 4: Submit application
      const submitResult = await submitApplication();
      
      // Step 5: Verify submission
      const verified = await verifySubmission(submitResult);
      
      return {
        success: true,
        submissionId: submitResult.id,
        verified,
        timestamp: new Date().toISOString()
      };
    },
    applicationData,
    {
      jobId: getCurrentJobId(),
      platform: getCurrentPlatform(),
      retryStrategy: 'exponential'
    }
  );
}

// Example 8: Handling Specific Submission Errors
async function handleSubmissionErrors(submissionFn, data) {
  try {
    return await submissionFn(data);
  } catch (error) {
    // Handle specific error types with targeted recovery
    switch (error.name) {
      case 'ValidationError':
        return await recoverFromValidationError(error, data);
      
      case 'SessionExpiredError':
        await refreshSession();
        return await submissionFn(data);
      
      case 'DuplicateApplicationError':
        return await handleDuplicateApplication(error, data);
      
      case 'JobUnavailableError':
        return await handleJobUnavailable(error, data);
      
      default:
        throw error;
    }
  }
}

/**
 * DATA CORRUPTION RECOVERY EXAMPLES
 */

// Example 9: Safe Data Processing with Integrity Checks
async function processJobDataSafely(rawData) {
  return await errorHandler.withDataRecovery(async () => {
    // Validate and clean raw data
    const cleanedData = sanitizeJobData(rawData);
    
    // Apply business logic
    const processedData = await applyJobProcessingRules(cleanedData);
    
    // Validate final result
    await validateJobData(processedData);
    
    return processedData;
  }, {
    data: rawData,
    operation: 'process_job_data',
    schema: 'JobDataSchema',
    checksum: calculateDataChecksum(rawData)
  });
}

// Example 10: Storage Operations with Corruption Recovery  
async function saveApplicationDataSafely(applicationData) {
  return await backgroundScriptErrorHandler.storageOperationSafely(
    async (data) => {
      // Create backup before saving
      const backup = await createDataBackup(data);
      
      try {
        // Save to primary storage
        await chrome.storage.local.set({
          [`application_${data.id}`]: data,
          [`backup_${data.id}`]: backup
        });
        
        // Verify save was successful
        const saved = await chrome.storage.local.get(`application_${data.id}`);
        if (!saved[`application_${data.id}`]) {
          throw new Error('Storage verification failed');
        }
        
        return { success: true, id: data.id };
      } catch (error) {
        // Restore from backup if main save failed
        await restoreFromBackup(backup);
        throw error;
      }
    },
    applicationData,
    {
      operation: 'save_application',
      dataType: 'application',
      id: applicationData.id
    }
  );
}

/**
 * BATCH PROCESSING WITH ERROR ISOLATION
 */

// Example 11: Process Multiple Jobs with Error Isolation
async function processJobListSafely(jobs) {
  return await backgroundScriptErrorHandler.processBatchSafely(
    jobs,
    async (job, index) => {
      console.log(`Processing job ${index + 1}/${jobs.length}: ${job.title}`);
      
      try {
        // Extract job details
        const details = await extractJobDetails(job);
        
        // Check for duplicates
        const isDuplicate = await checkForDuplicates(details);
        if (isDuplicate) {
          return { status: 'skipped', reason: 'duplicate' };
        }
        
        // Save to database
        const saved = await saveJobToDatabase(details);
        
        return { status: 'success', jobId: saved.id };
      } catch (error) {
        // Log error but continue with other jobs
        console.error(`Failed to process job ${job.title}:`, error);
        return { status: 'failed', error: error.message };
      }
    },
    {
      operation: 'process_job_list',
      batchSize: jobs.length
    }
  );
}

/**
 * UTILITY FUNCTIONS
 */

async function simulateTyping(element, text) {
  element.focus();
  element.value = '';
  
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
  }
  
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function getCurrentPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('indeed.com')) return 'indeed';
  if (hostname.includes('glassdoor.com')) return 'glassdoor';
  return 'unknown';
}

function getSubmitButtonSelector(platform) {
  const selectors = {
    linkedin: '[data-test="submit-btn"], .jobs-apply-button',
    indeed: '[data-testid="IndeedApplyButton"]',
    glassdoor: '.apply-btn, [data-test="apply-button"]'
  };
  
  return selectors[platform] || 'button[type="submit"]';
}

async function getCachedJobs() {
  try {
    const cached = await chrome.storage.local.get('cached_jobs');
    return cached.cached_jobs || [];
  } catch (error) {
    return [];
  }
}

function extractSalaryInfo() {
  const salaryElements = document.querySelectorAll('[data-test*="salary"], .salary-range');
  return Array.from(salaryElements).map(el => el.textContent.trim()).join(' ');
}

function extractRequirements() {
  const reqElements = document.querySelectorAll('[data-test*="requirement"], .job-requirements li');
  return Array.from(reqElements).map(el => el.textContent.trim());
}

function sanitizeJobData(data) {
  // Remove potentially dangerous content
  return {
    ...data,
    title: data.title?.replace(/<script.*?>.*?<\/script>/gi, ''),
    description: data.description?.replace(/<script.*?>.*?<\/script>/gi, ''),
    company: data.company?.trim(),
    location: data.location?.trim()
  };
}

async function validateJobData(data) {
  const required = ['title', 'company'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Required field missing: ${field}`);
    }
  }
  
  // Additional validation rules
  if (data.title.length < 3) {
    throw new Error('Job title too short');
  }
  
  if (data.company.length < 2) {
    throw new Error('Company name too short');
  }
}

function calculateDataChecksum(data) {
  // Simple checksum calculation for data integrity
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Export examples for testing and documentation
export {
  apiCallWithRecovery,
  sendMessageWithRecovery,
  uploadResumeWithRecovery,
  extractJobDataSafely,
  fillApplicationFormSafely,
  submitApplicationSafely,
  completeApplicationWithRecovery,
  processJobDataSafely,
  saveApplicationDataSafely,
  processJobListSafely
};
