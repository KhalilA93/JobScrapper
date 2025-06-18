// JobScrapper Notification System Usage Examples
// Demonstrates how to use the notification system in different scenarios

import { notify, getNotificationManager, NotificationTester } from '../utils/notificationIntegration.js';

// ============================================================================
// BASIC NOTIFICATION USAGE
// ============================================================================

/**
 * Example: Show success notification after job application
 */
async function exampleSuccessNotification() {
  const jobData = {
    jobTitle: 'Senior Software Engineer',
    company: 'Tech Innovations Inc.',
    platform: 'linkedin',
    appliedAt: new Date().toISOString(),
    processingTime: 45000, // 45 seconds
    automatedApplication: true
  };

  await notify.success(jobData);
  console.log('✅ Success notification sent');
}

/**
 * Example: Show error notification with retry options
 */
async function exampleErrorNotification() {
  const errorData = {
    jobTitle: 'Frontend Developer',
    company: 'Startup XYZ',
    platform: 'indeed',
    error: { 
      message: 'Form submission failed: Network timeout',
      code: 'NETWORK_TIMEOUT'
    },
    attempts: 1,
    maxAttempts: 3,
    url: 'https://indeed.com/jobs/frontend-developer-123'
  };

  await notify.error(errorData);
  console.log('❌ Error notification sent');
}

/**
 * Example: Show progress notification during bulk operations
 */
async function exampleProgressNotification() {
  const progressData = {
    completed: 7,
    total: 15,
    currentJob: {
      title: 'Full Stack Developer',
      company: 'Digital Solutions LLC'
    },
    successful: 6,
    failed: 1,
    estimatedTimeRemaining: 180000 // 3 minutes
  };

  await notify.progress(progressData.completed, progressData.total, progressData.currentJob);
  console.log('🔄 Progress notification sent');
}

/**
 * Example: Show daily summary notification
 */
async function exampleDailySummary() {
  await notify.dailySummary();
  console.log('📊 Daily summary notification sent');
}

// ============================================================================
// BULK OPERATION NOTIFICATIONS
// ============================================================================

/**
 * Example: Complete bulk application process with notifications
 */
async function exampleBulkApplicationProcess() {
  const jobsToApply = [
    { title: 'React Developer', company: 'Web Corp', platform: 'linkedin' },
    { title: 'Node.js Engineer', company: 'Backend Inc', platform: 'indeed' },
    { title: 'Full Stack Developer', company: 'Tech Solutions', platform: 'glassdoor' },
    { title: 'JavaScript Developer', company: 'Code Factory', platform: 'ziprecruiter' },
    { title: 'Frontend Engineer', company: 'UI Masters', platform: 'monster' }
  ];

  // Notify bulk operation start
  await notify.bulkStart(jobsToApply.length);
  console.log('🚀 Bulk operation started');

  let successful = 0;
  let failed = 0;

  // Process each job with progress updates
  for (let i = 0; i < jobsToApply.length; i++) {
    const job = jobsToApply[i];
    
    try {
      // Simulate application process
      console.log(`Processing: ${job.title} at ${job.company}`);
      await simulateApplicationProcess(job);
      
      successful++;
      
      // Show success notification
      await notify.success({
        jobTitle: job.title,
        company: job.company,
        platform: job.platform,
        appliedAt: new Date().toISOString(),
        automatedApplication: true
      });
      
    } catch (error) {
      failed++;
      
      // Show error notification
      await notify.error({
        jobTitle: job.title,
        company: job.company,
        platform: job.platform,
        error: { message: error.message },
        attempts: 1,
        maxAttempts: 3
      });
    }

    // Update progress (every 2 applications or at the end)
    if ((i + 1) % 2 === 0 || i === jobsToApply.length - 1) {
      await notify.progress(i + 1, jobsToApply.length, job);
    }

    // Add delay between applications
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Notify bulk operation complete
  const results = {
    total: jobsToApply.length,
    successful,
    failed,
    skipped: 0,
    duration: jobsToApply.length * 5000, // Simulated duration
    successRate: Math.round((successful / jobsToApply.length) * 100)
  };

  await notify.bulkComplete(results);
  console.log('✅ Bulk operation completed');
}

/**
 * Simulate application process (for example purposes)
 */
async function simulateApplicationProcess(job) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
  
  // Simulate occasional failures
  if (Math.random() < 0.2) { // 20% failure rate
    throw new Error('Simulated application failure');
  }
  
  return { success: true, processingTime: Math.random() * 5000 + 2000 };
}

// ============================================================================
// NOTIFICATION PREFERENCE MANAGEMENT
// ============================================================================

/**
 * Example: Update notification preferences
 */
async function exampleUpdatePreferences() {
  const manager = getNotificationManager();
  
  // Update specific preferences
  await manager.updatePreferences({
    successNotifications: true,
    errorNotifications: true,
    progressIndicators: false, // Disable progress notifications
    dailySummary: true,
    quietHours: {
      enabled: true,
      start: '23:00', // 11 PM
      end: '07:00'    // 7 AM
    },
    maxNotificationsPerHour: 15 // Increase rate limit
  });

  console.log('⚙️ Notification preferences updated');
}

/**
 * Example: Check notification status and permissions
 */
async function exampleCheckNotificationStatus() {
  const manager = getNotificationManager();
  
  // Request permissions if needed
  const hasPermissions = await manager.requestPermissions();
  console.log('🔐 Notification permissions:', hasPermissions ? 'Granted' : 'Denied');
  
  // Load current preferences
  await manager.loadPreferences();
  console.log('⚙️ Current preferences:', manager.preferences);
  
  // Check if currently in quiet hours
  const inQuietHours = manager.isInQuietHours();
  console.log('🤫 In quiet hours:', inQuietHours);
}

// ============================================================================
// ERROR HANDLING EXAMPLES
// ============================================================================

/**
 * Example: Handle notification errors gracefully
 */
async function exampleErrorHandling() {
  try {
    await notify.success({
      jobTitle: 'Test Position',
      company: 'Test Company',
      platform: 'linkedin'
    });
  } catch (error) {
    console.error('❌ Notification failed:', error);
    
    // Fallback to console logging
    console.log('📝 Fallback: Application successful - Test Position at Test Company');
    
    // Optionally store for later retry
    await storeFailedNotification({
      type: 'success',
      data: { jobTitle: 'Test Position', company: 'Test Company' },
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Store failed notifications for later retry
 */
async function storeFailedNotification(notificationData) {
  const result = await chrome.storage.local.get(['failedNotifications']);
  const failedNotifications = result.failedNotifications || [];
  
  failedNotifications.push(notificationData);
  
  // Keep only last 50 failed notifications
  if (failedNotifications.length > 50) {
    failedNotifications.splice(0, failedNotifications.length - 50);
  }
  
  await chrome.storage.local.set({ failedNotifications });
}

// ============================================================================
// TESTING AND DEBUGGING
// ============================================================================

/**
 * Example: Test all notification types
 */
async function exampleTestAllNotifications() {
  console.log('🧪 Testing all notification types...');
  
  // Test each notification type with delays
  const tests = [
    { name: 'Success', fn: () => NotificationTester.testSuccessNotification() },
    { name: 'Error', fn: () => NotificationTester.testErrorNotification() },
    { name: 'Progress', fn: () => NotificationTester.testProgressNotification() },
    { name: 'Daily Summary', fn: () => NotificationTester.testDailySummary() }
  ];

  for (const test of tests) {
    console.log(`🔍 Testing ${test.name} notification...`);
    await test.fn();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('✅ All notification tests completed');
}

/**
 * Example: Debug notification system
 */
async function exampleDebugNotifications() {
  const manager = getNotificationManager();
  
  console.log('🔍 Notification System Debug Info:');
  console.log('Preferences:', manager.preferences);
  console.log('Queue length:', manager.notificationQueue.length);
  console.log('Is processing:', manager.isProcessing);
  console.log('In quiet hours:', manager.isInQuietHours());
  
  // Check rate limiting
  const isRateLimited = await manager.isRateLimited();
  console.log('Rate limited:', isRateLimited);
  
  // Check recent notifications
  const result = await chrome.storage.local.get(['recentNotifications']);
  const recentCount = result.recentNotifications?.length || 0;
  console.log('Recent notifications:', recentCount);
}

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example: Integration with content script
 */
function exampleContentScriptIntegration() {
  // This would be used in a content script
  
  // Job detected
  contentNotify.jobDetected({
    jobTitle: 'Software Developer',
    company: 'Tech Corp',
    platform: 'linkedin',
    url: window.location.href
  });

  // Application started
  contentNotify.applicationStarted({
    jobTitle: 'Software Developer',
    company: 'Tech Corp',
    platform: 'linkedin'
  });

  // Form filling completed
  contentNotify.formFillCompleted({
    formType: 'application',
    fieldsCompleted: 12,
    platform: 'linkedin',
    processingTime: 5000
  });

  // Stealth detection
  contentNotify.stealthDetection({
    platform: 'linkedin',
    detectionType: 'rate_limit',
    confidence: 0.8,
    actionTaken: 'pause_automation'
  });
}

/**
 * Example: Integration with React component
 */
function exampleReactIntegration() {
  // This would be used in a React component
  
  const NotificationExample = () => {
    const { preferences, updatePreferences } = useNotificationPreferences();
    const { permissionGranted, requestPermissions } = useNotificationStatus();

    const handleEnableNotifications = async () => {
      if (!permissionGranted) {
        await requestPermissions();
      }
      
      await updatePreferences({ enabled: true });
    };

    return (
      <div>
        {!permissionGranted && (
          <button onClick={handleEnableNotifications}>
            Enable Notifications
          </button>
        )}
        
        <div>
          Notifications: {preferences?.enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>
    );
  };
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
  exampleSuccessNotification,
  exampleErrorNotification,
  exampleProgressNotification,
  exampleDailySummary,
  exampleBulkApplicationProcess,
  exampleUpdatePreferences,
  exampleCheckNotificationStatus,
  exampleErrorHandling,
  exampleTestAllNotifications,
  exampleDebugNotifications
};

// Example usage in console:
// import * as examples from './notificationExamples.js';
// await examples.exampleSuccessNotification();
// await examples.exampleBulkApplicationProcess();
// await examples.exampleTestAllNotifications();
