// JobScrapper Notification System
// Comprehensive notification utilities for application status tracking

import { MessageHelper, MessageTypes } from './messageProtocol.js';

/**
 * Core Notification Manager
 * Handles all types of notifications with user preferences
 */
class NotificationManager {
  constructor() {
    this.preferences = {};
    this.notificationQueue = [];
    this.isProcessing = false;
    this.dailyStats = {
      successful: 0,
      failed: 0,
      total: 0,
      lastReset: new Date().toDateString()
    };
    
    this.initialize();
  }

  async initialize() {
    await this.loadPreferences();
    await this.requestPermissions();
    this.setupDailyReset();
    console.log('🔔 Notification system initialized');
  }

  // ============================================================================
  // PREFERENCE MANAGEMENT
  // ============================================================================

  async loadPreferences() {
    const result = await chrome.storage.sync.get(['notificationPreferences']);
    this.preferences = {
      enabled: true,
      successNotifications: true,
      errorNotifications: true,
      dailySummary: true,
      progressIndicators: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      maxNotificationsPerHour: 10,
      ...result.notificationPreferences
    };
  }

  async updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    await chrome.storage.sync.set({ 
      notificationPreferences: this.preferences 
    });
  }

  // ============================================================================
  // PERMISSION HANDLING
  // ============================================================================

  async requestPermissions() {
    try {
      if (!chrome.notifications) {
        console.warn('⚠️ Notifications API not available');
        return false;
      }

      const permission = await new Promise((resolve) => {
        chrome.notifications.getPermissionLevel((level) => {
          resolve(level === 'granted');
        });
      });

      if (!permission) {
        console.warn('⚠️ Notification permissions not granted');
      }

      return permission;
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      return false;
    }
  }

  // ============================================================================
  // 1. SUCCESS NOTIFICATIONS
  // ============================================================================

  async notifyApplicationSuccess(applicationData) {
    if (!this.shouldNotify('successNotifications')) return;

    const notification = {
      type: 'success',
      title: '✅ Application Submitted Successfully',
      message: `Applied to ${applicationData.jobTitle} at ${applicationData.company}`,
      data: applicationData,
      priority: 'normal'
    };

    await this.showNotification(notification);
    this.updateDailyStats('successful');
  }

  async notifyBulkApplicationProgress(completed, total, currentJob) {
    if (!this.shouldNotify('progressIndicators')) return;

    const progress = Math.round((completed / total) * 100);
    const notification = {
      type: 'progress',
      title: `🚀 Application Progress (${progress}%)`,
      message: `${completed}/${total} applications completed. Current: ${currentJob.title}`,
      data: { completed, total, progress, currentJob },
      priority: 'low',
      requireInteraction: false
    };

    await this.showNotification(notification);
  }

  // ============================================================================
  // 2. ERROR ALERTS
  // ============================================================================

  async notifyApplicationError(errorData) {
    if (!this.shouldNotify('errorNotifications')) return;

    const notification = {
      type: 'error',
      title: '❌ Application Failed',
      message: this.formatErrorMessage(errorData),
      data: errorData,
      priority: 'high',
      requireInteraction: true,
      buttons: [
        { title: 'Retry', iconUrl: 'icons/retry.png' },
        { title: 'Skip', iconUrl: 'icons/skip.png' }
      ]
    };

    await this.showNotification(notification);
    this.updateDailyStats('failed');
  }

  formatErrorMessage(errorData) {
    const { jobTitle, company, error, attempts, maxAttempts } = errorData;
    
    if (attempts >= maxAttempts) {
      return `Failed to apply to ${jobTitle} at ${company} after ${attempts} attempts. ${error.message}`;
    }
    
    return `Application to ${jobTitle} at ${company} failed (Attempt ${attempts}/${maxAttempts}). ${error.message}`;
  }

  async notifySystemError(errorType, errorMessage) {
    if (!this.shouldNotify('errorNotifications')) return;

    const notification = {
      type: 'system_error',
      title: '⚠️ System Error',
      message: `${errorType}: ${errorMessage}`,
      data: { errorType, errorMessage },
      priority: 'high',
      requireInteraction: true
    };

    await this.showNotification(notification);
  }

  // ============================================================================
  // 3. DAILY SUMMARY NOTIFICATIONS
  // ============================================================================

  async showDailySummary() {
    if (!this.shouldNotify('dailySummary')) return;

    const summary = await this.generateDailySummary();
    const notification = {
      type: 'daily_summary',
      title: '📊 Daily Application Summary',
      message: this.formatDailySummary(summary),
      data: summary,
      priority: 'normal',
      requireInteraction: false
    };

    await this.showNotification(notification);
    this.resetDailyStats();
  }

  async generateDailySummary() {
    try {
      // Get today's applications from storage or API
      const today = new Date().toDateString();
      const applications = await this.getApplicationsForDate(today);
      
      const summary = {
        date: today,
        total: applications.length,
        successful: applications.filter(app => app.status === 'applied').length,
        failed: applications.filter(app => app.status === 'failed').length,
        pending: applications.filter(app => app.status === 'pending').length,
        platforms: this.groupByPlatform(applications),
        topCompanies: this.getTopCompanies(applications),
        averageProcessingTime: this.calculateAverageProcessingTime(applications)
      };

      return summary;
    } catch (error) {
      console.error('❌ Failed to generate daily summary:', error);
      return this.dailyStats;
    }
  }

  formatDailySummary(summary) {
    const { total, successful, failed } = summary;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    
    if (total === 0) {
      return 'No applications submitted today. Ready for tomorrow! 🚀';
    }

    return `Today: ${total} applications • ${successful} successful • ${failed} failed • ${successRate}% success rate`;
  }

  // ============================================================================
  // 4. PROGRESS INDICATORS
  // ============================================================================

  async showBulkOperationStart(totalJobs) {
    if (!this.shouldNotify('progressIndicators')) return;

    const notification = {
      type: 'bulk_start',
      title: '🚀 Bulk Application Started',
      message: `Starting automated applications to ${totalJobs} jobs`,
      data: { totalJobs, startTime: Date.now() },
      priority: 'normal',
      requireInteraction: false
    };

    await this.showNotification(notification);
  }

  async updateBulkProgress(progress) {
    if (!this.shouldNotify('progressIndicators')) return;

    const { completed, total, currentJob, errors, estimatedTimeRemaining } = progress;
    
    // Only show progress notifications every 10% or on significant events
    if (completed % Math.ceil(total / 10) !== 0 && !progress.forceUpdate) return;

    const notification = {
      type: 'bulk_progress',
      title: `🔄 Applications in Progress (${Math.round((completed/total)*100)}%)`,
      message: this.formatProgressMessage(progress),
      data: progress,
      priority: 'low',
      requireInteraction: false
    };

    await this.showNotification(notification);
  }

  formatProgressMessage(progress) {
    const { completed, total, currentJob, errors, estimatedTimeRemaining } = progress;
    const timeString = estimatedTimeRemaining ? ` • ${this.formatTime(estimatedTimeRemaining)} remaining` : '';
    const errorString = errors > 0 ? ` • ${errors} errors` : '';
    
    return `${completed}/${total} completed${errorString}${timeString}`;
  }

  async showBulkOperationComplete(results) {
    if (!this.shouldNotify('progressIndicators')) return;

    const notification = {
      type: 'bulk_complete',
      title: '✅ Bulk Application Complete',
      message: this.formatBulkResults(results),
      data: results,
      priority: 'normal',
      requireInteraction: false,
      buttons: [
        { title: 'View Results', iconUrl: 'icons/view.png' }
      ]
    };

    await this.showNotification(notification);
  }

  formatBulkResults(results) {
    const { total, successful, failed, skipped, duration } = results;
    const successRate = Math.round((successful / total) * 100);
    const durationString = this.formatTime(duration);
    
    return `${total} jobs processed in ${durationString} • ${successful} successful (${successRate}%) • ${failed} failed`;
  }

  // ============================================================================
  // NOTIFICATION QUEUE AND RATE LIMITING
  // ============================================================================

  async showNotification(notification) {
    if (!this.preferences.enabled) return;
    if (this.isInQuietHours()) return;

    // Add to queue for rate limiting
    this.notificationQueue.push({
      ...notification,
      timestamp: Date.now(),
      id: this.generateNotificationId()
    });

    if (!this.isProcessing) {
      this.processNotificationQueue();
    }
  }

  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const notification = this.notificationQueue.shift();

    try {
      // Check rate limiting
      if (await this.isRateLimited()) {
        console.log('⏰ Notification rate limited, queuing for later');
        this.notificationQueue.unshift(notification);
        setTimeout(() => this.processNotificationQueue(), 60000); // Retry in 1 minute
        return;
      }

      await this.displayNotification(notification);
      
      // Process next notification after delay
      setTimeout(() => this.processNotificationQueue(), 1000);
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      setTimeout(() => this.processNotificationQueue(), 5000);
    }
  }

  async displayNotification(notification) {
    const chromeNotification = {
      type: 'basic',
      iconUrl: this.getIconForType(notification.type),
      title: notification.title,
      message: notification.message,
      priority: this.mapPriority(notification.priority),
      requireInteraction: notification.requireInteraction || false,
      buttons: notification.buttons || []
    };

    // Show progress notifications as list type if supported
    if (notification.type === 'bulk_progress' && notification.data.details) {
      chromeNotification.type = 'list';
      chromeNotification.items = notification.data.details.map(item => ({
        title: item.title,
        message: item.status
      }));
    }

    return new Promise((resolve, reject) => {
      chrome.notifications.create(notification.id, chromeNotification, (notificationId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.trackNotification(notificationId, notification);
          resolve(notificationId);
        }
      });
    });
  }

  // ============================================================================
  // NOTIFICATION INTERACTION HANDLING
  // ============================================================================

  setupNotificationHandlers() {
    if (!chrome.notifications) return;

    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      this.handleNotificationButtonClick(notificationId, buttonIndex);
    });

    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      this.handleNotificationClosed(notificationId, byUser);
    });
  }

  async handleNotificationClick(notificationId) {
    const notification = this.getTrackedNotification(notificationId);
    if (!notification) return;

    switch (notification.type) {
      case 'success':
        await this.openApplicationDetails(notification.data);
        break;
      case 'error':
        await this.openErrorDetails(notification.data);
        break;
      case 'daily_summary':
        await this.openDashboard();
        break;
      case 'bulk_complete':
        await this.openBulkResults(notification.data);
        break;
    }

    chrome.notifications.clear(notificationId);
  }

  async handleNotificationButtonClick(notificationId, buttonIndex) {
    const notification = this.getTrackedNotification(notificationId);
    if (!notification) return;

    if (notification.type === 'error' && notification.buttons) {
      const button = notification.buttons[buttonIndex];
      
      if (button.title === 'Retry') {
        await this.retryFailedApplication(notification.data);
      } else if (button.title === 'Skip') {
        await this.skipFailedApplication(notification.data);
      }
    }

    chrome.notifications.clear(notificationId);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  shouldNotify(type) {
    return this.preferences.enabled && this.preferences[type] && !this.isInQuietHours();
  }

  isInQuietHours() {
    if (!this.preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = this.parseTime(this.preferences.quietHours.start);
    const endTime = this.parseTime(this.preferences.quietHours.end);

    if (startTime > endTime) {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Same day quiet hours (e.g., 12:00 to 14:00)
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  async isRateLimited() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const result = await chrome.storage.local.get(['recentNotifications']);
    const recentNotifications = result.recentNotifications || [];
    
    const recentCount = recentNotifications.filter(timestamp => timestamp > oneHourAgo).length;
    return recentCount >= this.preferences.maxNotificationsPerHour;
  }

  async trackNotification(notificationId, notification) {
    const now = Date.now();
    
    // Store notification for interaction handling
    const result = await chrome.storage.local.get(['trackedNotifications', 'recentNotifications']);
    const trackedNotifications = result.trackedNotifications || {};
    const recentNotifications = result.recentNotifications || [];

    trackedNotifications[notificationId] = notification;
    recentNotifications.push(now);

    // Clean up old entries
    const oneHourAgo = now - (60 * 60 * 1000);
    const cleanRecentNotifications = recentNotifications.filter(timestamp => timestamp > oneHourAgo);

    await chrome.storage.local.set({
      trackedNotifications,
      recentNotifications: cleanRecentNotifications
    });
  }

  getTrackedNotification(notificationId) {
    return chrome.storage.local.get(['trackedNotifications']).then(result => {
      return result.trackedNotifications?.[notificationId];
    });
  }

  generateNotificationId() {
    return `jobscrapper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getIconForType(type) {
    const icons = {
      success: 'icons/success.png',
      error: 'icons/error.png',
      progress: 'icons/progress.png',
      daily_summary: 'icons/summary.png',
      bulk_start: 'icons/bulk.png',
      bulk_progress: 'icons/progress.png',
      bulk_complete: 'icons/complete.png',
      system_error: 'icons/warning.png'
    };
    return icons[type] || 'icons/icon48.png';
  }

  mapPriority(priority) {
    const priorityMap = {
      low: 0,
      normal: 1,
      high: 2
    };
    return priorityMap[priority] || 1;
  }

  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  updateDailyStats(type) {
    const today = new Date().toDateString();
    if (this.dailyStats.lastReset !== today) {
      this.resetDailyStats();
    }

    this.dailyStats[type]++;
    this.dailyStats.total++;
    this.saveDailyStats();
  }

  resetDailyStats() {
    this.dailyStats = {
      successful: 0,
      failed: 0,
      total: 0,
      lastReset: new Date().toDateString()
    };
    this.saveDailyStats();
  }

  async saveDailyStats() {
    await chrome.storage.local.set({ dailyStats: this.dailyStats });
  }

  setupDailyReset() {
    // Schedule daily summary at 9 PM
    const now = new Date();
    const summaryTime = new Date();
    summaryTime.setHours(21, 0, 0, 0); // 9 PM

    if (summaryTime <= now) {
      summaryTime.setDate(summaryTime.getDate() + 1);
    }

    const timeUntilSummary = summaryTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.showDailySummary();
      // Set up recurring daily summaries
      setInterval(() => this.showDailySummary(), 24 * 60 * 60 * 1000);
    }, timeUntilSummary);
  }

  // ============================================================================
  // DATA HELPER METHODS
  // ============================================================================

  async getApplicationsForDate(date) {
    try {
      // Try to get from API first
      const response = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_ANALYTICS,
        data: { type: 'daily', date }
      });
      return response.applications || [];
    } catch (error) {
      // Fallback to local storage
      const result = await chrome.storage.local.get(['applications']);
      const applications = result.applications || [];
      return applications.filter(app => 
        new Date(app.appliedAt).toDateString() === date
      );
    }
  }

  groupByPlatform(applications) {
    return applications.reduce((acc, app) => {
      acc[app.platform] = (acc[app.platform] || 0) + 1;
      return acc;
    }, {});
  }

  getTopCompanies(applications) {
    const companies = applications.reduce((acc, app) => {
      acc[app.company] = (acc[app.company] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(companies)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));
  }

  calculateAverageProcessingTime(applications) {
    const withProcessingTime = applications.filter(app => app.processingTime);
    if (withProcessingTime.length === 0) return 0;

    const total = withProcessingTime.reduce((sum, app) => sum + app.processingTime, 0);
    return Math.round(total / withProcessingTime.length);
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  async retryFailedApplication(applicationData) {
    await MessageHelper.sendToBackground({
      type: MessageTypes.RETRY_APPLICATION,
      data: applicationData
    });
  }

  async skipFailedApplication(applicationData) {
    await MessageHelper.sendToBackground({
      type: MessageTypes.SKIP_APPLICATION,
      data: applicationData
    });
  }

  async openApplicationDetails(applicationData) {
    chrome.tabs.create({
      url: applicationData.jobUrl || 'chrome-extension://popup.html#application-details'
    });
  }

  async openErrorDetails(errorData) {
    chrome.tabs.create({
      url: 'chrome-extension://popup.html#error-details'
    });
  }

  async openDashboard() {
    chrome.tabs.create({
      url: 'chrome-extension://popup.html#dashboard'
    });
  }

  async openBulkResults(resultsData) {
    chrome.tabs.create({
      url: 'chrome-extension://popup.html#bulk-results'
    });
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES MANAGER
// ============================================================================

class NotificationPreferences {
  constructor() {
    this.defaultPreferences = {
      enabled: true,
      successNotifications: true,
      errorNotifications: true,
      dailySummary: true,
      progressIndicators: true,
      soundEnabled: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      maxNotificationsPerHour: 10,
      summaryTime: '21:00',
      priorities: {
        success: 'normal',
        error: 'high',
        progress: 'low',
        summary: 'normal'
      }
    };
  }

  async getPreferences() {
    const result = await chrome.storage.sync.get(['notificationPreferences']);
    return { ...this.defaultPreferences, ...result.notificationPreferences };
  }

  async updatePreferences(updates) {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    await chrome.storage.sync.set({ notificationPreferences: updated });
    return updated;
  }

  async resetToDefaults() {
    await chrome.storage.sync.set({ notificationPreferences: this.defaultPreferences });
    return this.defaultPreferences;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { NotificationManager, NotificationPreferences };
export default NotificationManager;
