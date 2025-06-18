// Notification Integration Utilities
// Helper functions and hooks for integrating notifications throughout the extension

import NotificationManager from './notificationSystem.js';

/**
 * Global Notification Instance
 * Singleton pattern for consistent notification management
 */
let notificationInstance = null;

export const getNotificationManager = () => {
  if (!notificationInstance) {
    notificationInstance = new NotificationManager();
  }
  return notificationInstance;
};

// ============================================================================
// QUICK NOTIFICATION HELPERS
// ============================================================================

/**
 * Quick notification functions for common use cases
 */
export const notify = {
  /**
   * Show success notification for completed application
   */
  success: async (jobData) => {
    const manager = getNotificationManager();
    await manager.notifyApplicationSuccess(jobData);
  },

  /**
   * Show error notification for failed application
   */
  error: async (errorData) => {
    const manager = getNotificationManager();
    await manager.notifyApplicationError(errorData);
  },

  /**
   * Show system error notification
   */
  systemError: async (errorType, message) => {
    const manager = getNotificationManager();
    await manager.notifySystemError(errorType, message);
  },

  /**
   * Show bulk operation progress
   */
  progress: async (completed, total, currentJob) => {
    const manager = getNotificationManager();
    await manager.notifyBulkApplicationProgress(completed, total, currentJob);
  },

  /**
   * Show bulk operation start
   */
  bulkStart: async (totalJobs) => {
    const manager = getNotificationManager();
    await manager.showBulkOperationStart(totalJobs);
  },

  /**
   * Show bulk operation complete
   */
  bulkComplete: async (results) => {
    const manager = getNotificationManager();
    await manager.showBulkOperationComplete(results);
  },

  /**
   * Show daily summary
   */
  dailySummary: async () => {
    const manager = getNotificationManager();
    await manager.showDailySummary();
  }
};

// ============================================================================
// NOTIFICATION HOOKS FOR REACT COMPONENTS
// ============================================================================

/**
 * React hook for notification preferences management
 */
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const manager = getNotificationManager();
      await manager.loadPreferences();
      setPreferences(manager.preferences);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates) => {
    try {
      const manager = getNotificationManager();
      await manager.updatePreferences(updates);
      setPreferences(manager.preferences);
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    reload: loadPreferences
  };
};

/**
 * React hook for notification status and controls
 */
export const useNotificationStatus = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    checkPermissions();
    loadPreferences();
  }, []);

  const checkPermissions = async () => {
    try {
      const manager = getNotificationManager();
      const granted = await manager.requestPermissions();
      setPermissionGranted(granted);
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      setPermissionGranted(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const manager = getNotificationManager();
      await manager.loadPreferences();
      setPreferences(manager.preferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const requestPermissions = async () => {
    const manager = getNotificationManager();
    const granted = await manager.requestPermissions();
    setPermissionGranted(granted);
    return granted;
  };

  return {
    permissionGranted,
    preferences,
    requestPermissions,
    isEnabled: preferences?.enabled && permissionGranted
  };
};

// ============================================================================
// BACKGROUND SCRIPT INTEGRATION
// ============================================================================

/**
 * Initialize notifications in background script
 */
export const initializeNotifications = async () => {
  const manager = getNotificationManager();
  manager.setupNotificationHandlers();
  
  console.log('🔔 Notification system initialized in background');
  return manager;
};

/**
 * Handle application events and trigger appropriate notifications
 */
export const handleApplicationEvent = async (event) => {
  const { type, data } = event;

  switch (type) {
    case 'APPLICATION_SUCCESS':
      await notify.success(data);
      break;

    case 'APPLICATION_ERROR':
      await notify.error(data);
      break;

    case 'BULK_START':
      await notify.bulkStart(data.totalJobs);
      break;

    case 'BULK_PROGRESS':
      await notify.progress(data.completed, data.total, data.currentJob);
      break;

    case 'BULK_COMPLETE':
      await notify.bulkComplete(data.results);
      break;

    case 'SYSTEM_ERROR':
      await notify.systemError(data.errorType, data.message);
      break;

    case 'DAILY_SUMMARY':
      await notify.dailySummary();
      break;

    default:
      console.warn('Unknown application event type:', type);
  }
};

// ============================================================================
// CONTENT SCRIPT INTEGRATION
// ============================================================================

/**
 * Send notification events from content script to background
 */
export const sendNotificationEvent = async (eventType, data) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'NOTIFICATION_EVENT',
      eventType,
      data
    });
  } catch (error) {
    console.error('Failed to send notification event:', error);
  }
};

/**
 * Common notification events for content scripts
 */
export const contentNotify = {
  jobDetected: (jobData) => 
    sendNotificationEvent('JOB_DETECTED', jobData),
  
  applicationStarted: (jobData) => 
    sendNotificationEvent('APPLICATION_STARTED', jobData),
  
  applicationCompleted: (jobData) => 
    sendNotificationEvent('APPLICATION_SUCCESS', jobData),
  
  applicationFailed: (errorData) => 
    sendNotificationEvent('APPLICATION_ERROR', errorData),
  
  formFillCompleted: (formData) => 
    sendNotificationEvent('FORM_FILL_COMPLETED', formData),
  
  stealthDetection: (detectionData) => 
    sendNotificationEvent('STEALTH_DETECTION', detectionData)
};

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Pre-defined notification templates for consistency
 */
export const NotificationTemplates = {
  APPLICATION_SUCCESS: (jobData) => ({
    title: '✅ Application Submitted',
    message: `Successfully applied to ${jobData.jobTitle} at ${jobData.company}`,
    type: 'success',
    data: jobData
  }),

  APPLICATION_ERROR: (errorData) => ({
    title: '❌ Application Failed',
    message: `Failed to apply to ${errorData.jobTitle}: ${errorData.error.message}`,
    type: 'error',
    data: errorData,
    buttons: [
      { title: 'Retry', action: 'retry' },
      { title: 'Skip', action: 'skip' }
    ]
  }),

  BULK_PROGRESS: (progressData) => ({
    title: `🔄 Progress: ${Math.round((progressData.completed/progressData.total)*100)}%`,
    message: `${progressData.completed}/${progressData.total} applications completed`,
    type: 'progress',
    data: progressData
  }),

  DAILY_SUMMARY: (summaryData) => ({
    title: '📊 Daily Summary',
    message: `${summaryData.total} applications • ${summaryData.successful} successful`,
    type: 'summary',
    data: summaryData
  }),

  SYSTEM_ERROR: (errorType, message) => ({
    title: '⚠️ System Error',
    message: `${errorType}: ${message}`,
    type: 'system_error',
    priority: 'high'
  }),

  STEALTH_WARNING: (detectionData) => ({
    title: '🕵️ Stealth Mode Alert',
    message: `Possible detection on ${detectionData.platform}. Pausing automation.`,
    type: 'warning',
    data: detectionData,
    priority: 'high'
  })
};

// ============================================================================
// NOTIFICATION ANALYTICS
// ============================================================================

/**
 * Track notification engagement and effectiveness
 */
export class NotificationAnalytics {
  constructor() {
    this.metrics = {
      shown: 0,
      clicked: 0,
      dismissed: 0,
      actionTaken: 0
    };
  }

  async trackNotificationShown(type) {
    this.metrics.shown++;
    await this.saveMetrics();
  }

  async trackNotificationClicked(type) {
    this.metrics.clicked++;
    await this.saveMetrics();
  }

  async trackNotificationDismissed(type) {
    this.metrics.dismissed++;
    await this.saveMetrics();
  }

  async trackNotificationAction(type, action) {
    this.metrics.actionTaken++;
    await this.saveMetrics();
  }

  async getEngagementRate() {
    const { shown, clicked, actionTaken } = this.metrics;
    if (shown === 0) return 0;
    return Math.round(((clicked + actionTaken) / shown) * 100);
  }

  async saveMetrics() {
    await chrome.storage.local.set({ 
      notificationMetrics: this.metrics 
    });
  }

  async loadMetrics() {
    const result = await chrome.storage.local.get(['notificationMetrics']);
    this.metrics = { ...this.metrics, ...result.notificationMetrics };
  }
}

// ============================================================================
// NOTIFICATION TESTING UTILITIES
// ============================================================================

/**
 * Testing utilities for notification system
 */
export const NotificationTester = {
  async testSuccessNotification() {
    await notify.success({
      jobTitle: 'Test Software Engineer Position',
      company: 'Test Company Inc.',
      platform: 'linkedin',
      appliedAt: new Date().toISOString()
    });
  },

  async testErrorNotification() {
    await notify.error({
      jobTitle: 'Test Position',
      company: 'Test Company',
      error: { message: 'Test error message' },
      attempts: 1,
      maxAttempts: 3
    });
  },

  async testProgressNotification() {
    await notify.progress(5, 10, {
      title: 'Test Job Title',
      company: 'Test Company'
    });
  },

  async testDailySummary() {
    await notify.dailySummary();
  },

  async testAllNotifications() {
    console.log('🧪 Testing all notification types...');
    
    await this.testSuccessNotification();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testErrorNotification();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testProgressNotification();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testDailySummary();
    
    console.log('✅ All notification tests completed');
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getNotificationManager,
  initializeNotifications,
  handleApplicationEvent,
  NotificationTemplates,
  NotificationAnalytics
};

export default {
  notify,
  getNotificationManager,
  useNotificationPreferences,
  useNotificationStatus,
  initializeNotifications,
  handleApplicationEvent,
  contentNotify,
  NotificationTemplates,
  NotificationAnalytics,
  NotificationTester
};
