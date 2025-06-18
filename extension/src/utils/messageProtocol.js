// JobScrapper Extension Message Protocol
// Standardized message types and data structures for extension communication

/**
 * Message Protocol for JobScrapper Chrome Extension
 * Defines communication between Background Service Worker, Content Scripts, and Popup
 */

// ============================================================================
// MESSAGE TYPES & STRUCTURES
// ============================================================================

export const MessageTypes = {
  // Content Script -> Background
  JOB_DETECTED: 'JOB_DETECTED',
  APPLICATION_START: 'APPLICATION_START',
  APPLICATION_STEP: 'APPLICATION_STEP',
  APPLICATION_COMPLETE: 'APPLICATION_COMPLETE',
  APPLICATION_ERROR: 'APPLICATION_ERROR',
  
  // Popup -> Background
  GET_STATUS: 'GET_STATUS',
  START_APPLICATION: 'START_APPLICATION',
  PAUSE_APPLICATION: 'PAUSE_APPLICATION',
  GET_QUEUE: 'GET_QUEUE',
  CLEAR_QUEUE: 'CLEAR_QUEUE',
  GET_ANALYTICS: 'GET_ANALYTICS',
  SYNC_DATA: 'SYNC_DATA',
  
  // Background -> Content Script
  JOB_SITE_DETECTED: 'JOB_SITE_DETECTED',
  START_APPLICATION: 'START_APPLICATION',
  CHECK_FOR_JOBS: 'CHECK_FOR_JOBS',
  
  // Background -> Popup
  TO_POPUP: 'TO_POPUP',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  APPLICATION_STATUS: 'APPLICATION_STATUS'
};

// ============================================================================
// MESSAGE DATA SCHEMAS
// ============================================================================

/**
 * Job Detection Message
 * Sent from content script when a job is detected
 */
export const JobDetectedMessage = {
  type: 'JOB_DETECTED',
  data: {
    jobId: 'string',           // Unique job identifier
    title: 'string',           // Job title
    company: 'string',         // Company name
    location: 'string',        // Job location
    platform: 'string',       // linkedin|indeed|glassdoor|etc
    url: 'string',             // Job listing URL
    applyUrl: 'string',        // Direct apply URL
    description: 'string',     // Job description
    requirements: ['string'],  // Job requirements array
    salary: {                  // Salary information
      min: 'number',
      max: 'number',
      currency: 'string'
    },
    postedDate: 'ISO string',  // When job was posted
    scrapedAt: 'timestamp'     // When data was scraped
  }
};

/**
 * Application Start Message
 * Initiates job application process
 */
export const ApplicationStartMessage = {
  type: 'APPLICATION_START',
  data: {
    jobData: 'JobDetectedMessage.data',
    userData: {
      firstName: 'string',
      lastName: 'string',
      email: 'string',
      phone: 'string',
      resumeUrl: 'string',
      coverLetter: 'string',
      customAnswers: {
        'question': 'answer'
      }
    },
    queueId: 'string',         // Unique queue identifier
    settings: {
      enableStealth: 'boolean',
      autoSubmit: 'boolean',
      maxRetries: 'number'
    }
  }
};

/**
 * Application Step Message
 * Progress update during multi-step application
 */
export const ApplicationStepMessage = {
  type: 'APPLICATION_STEP',
  data: {
    queueId: 'string',
    currentStep: 'number',
    totalSteps: 'number',
    stepName: 'string',        // 'personal_info'|'experience'|'review'
    progress: 'number',        // 0-100 percentage
    fieldsCompleted: 'number',
    fieldsTotal: 'number',
    errors: ['string'],        // Any errors encountered
    timestamp: 'timestamp'
  }
};

/**
 * Application Complete Message
 * Final result of application process
 */
export const ApplicationCompleteMessage = {
  type: 'APPLICATION_COMPLETE',
  data: {
    queueId: 'string',
    success: 'boolean',
    applicationId: 'string',   // Platform-specific application ID
    submittedAt: 'timestamp',
    processingTime: 'number',  // Time taken in milliseconds
    stepsCompleted: 'number',
    fieldsCompleted: 'number',
    result: {
      status: 'applied|pending|error',
      confirmationNumber: 'string',
      redirectUrl: 'string',
      message: 'string'
    },
    errors: ['string']
  }
};

/**
 * Queue Status Message
 * Current state of application queue
 */
export const QueueStatusMessage = {
  type: 'GET_STATUS',
  response: {
    queueLength: 'number',
    processing: 'boolean',
    syncQueue: 'number',
    uptime: 'number',
    stats: {
      totalProcessed: 'number',
      successRate: 'number',
      averageTime: 'number'
    }
  }
};

// ============================================================================
// MESSAGE UTILITIES
// ============================================================================

/**
 * Message Builder Utility
 * Creates properly formatted messages
 */
export class MessageBuilder {
  static jobDetected(jobData) {
    return {
      type: MessageTypes.JOB_DETECTED,
      data: {
        ...jobData,
        scrapedAt: Date.now()
      },
      timestamp: Date.now()
    };
  }

  static applicationStart(jobData, userData, settings = {}) {
    return {
      type: MessageTypes.APPLICATION_START,
      data: {
        jobData,
        userData,
        queueId: `app_${Date.now()}`,
        settings: {
          enableStealth: true,
          autoSubmit: false,
          maxRetries: 3,
          ...settings
        }
      },
      timestamp: Date.now()
    };
  }

  static applicationStep(queueId, stepData) {
    return {
      type: MessageTypes.APPLICATION_STEP,
      data: {
        queueId,
        ...stepData,
        timestamp: Date.now()
      }
    };
  }

  static applicationComplete(queueId, result) {
    return {
      type: MessageTypes.APPLICATION_COMPLETE,
      data: {
        queueId,
        ...result,
        timestamp: Date.now()
      }
    };
  }

  static response(success, data, error = null) {
    return {
      success,
      data,
      error,
      timestamp: Date.now()
    };
  }
}

/**
 * Message Validator
 * Validates message structure and types
 */
export class MessageValidator {
  static validate(message, expectedType) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }

    if (expectedType && message.type !== expectedType) {
      throw new Error(`Expected message type ${expectedType}, got ${message.type}`);
    }

    if (!message.data) {
      throw new Error('Message missing data field');
    }

    return true;
  }

  static validateJobData(jobData) {
    const required = ['jobId', 'title', 'company', 'platform', 'url'];
    
    for (const field of required) {
      if (!jobData[field]) {
        throw new Error(`Job data missing required field: ${field}`);
      }
    }

    return true;
  }

  static validateUserData(userData) {
    const required = ['firstName', 'lastName', 'email'];
    
    for (const field of required) {
      if (!userData[field]) {
        throw new Error(`User data missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }
}

// ============================================================================
// COMMUNICATION HELPER
// ============================================================================

/**
 * Communication Helper
 * Simplifies message sending and receiving
 */
export class MessageHelper {
  /**
   * Send message to background script
   */
  static async sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && !response.success) {
          reject(new Error(response.error || 'Unknown error'));
        } else {
          resolve(response?.data);
        }
      });
    });
  }

  /**
   * Send message to content script
   */
  static async sendToContent(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && !response.success) {
          reject(new Error(response.error || 'Unknown error'));
        } else {
          resolve(response?.data);
        }
      });
    });
  }

  /**
   * Listen for messages with type filtering
   */
  static onMessage(messageType, handler) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === messageType) {
        try {
          MessageValidator.validate(message, messageType);
          const result = handler(message.data, sender);
          
          if (result instanceof Promise) {
            result
              .then(data => sendResponse(MessageBuilder.response(true, data)))
              .catch(error => sendResponse(MessageBuilder.response(false, null, error.message)));
            return true; // Keep channel open
          } else {
            sendResponse(MessageBuilder.response(true, result));
          }
        } catch (error) {
          sendResponse(MessageBuilder.response(false, null, error.message));
        }
      }
    });
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Content Script Example
/*
// Detect and report job
const jobData = await extractJobData();
await MessageHelper.sendToBackground(
  MessageBuilder.jobDetected(jobData)
);

// Listen for application start
MessageHelper.onMessage(MessageTypes.START_APPLICATION, async (data) => {
  const stateMachine = new ApplicationStateMachine();
  return await stateMachine.startApplication(data.userData);
});
*/

// Popup Example  
/*
// Get queue status
const status = await MessageHelper.sendToBackground({
  type: MessageTypes.GET_STATUS
});

// Start application
await MessageHelper.sendToBackground(
  MessageBuilder.applicationStart(jobData, userData)
);
*/
