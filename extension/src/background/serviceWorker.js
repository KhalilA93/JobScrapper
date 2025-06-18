// JobScrapper Background Service Worker - Modern Chrome Extension Implementation
// Handles message passing, job monitoring, application queue, and API synchronization

import { ApplicationStateMachine } from '../utils/applicationStateMachine.js';
import { AutoFillSystem } from '../utils/autoFillSystem.js';
import { StealthUtils } from '../utils/stealthUtils.js';
import { initializeNotifications, handleApplicationEvent } from '../utils/notificationIntegration.js';

/**
 * Background Service Worker for JobScrapper Extension
 * Manages communication, job processing, and API synchronization
 */
class JobScrapperService {
  constructor() {
    this.messageHandlers = new Map();
    this.applicationQueue = new Map(); // tabId -> application state
    this.jobCheckInterval = null;
    this.syncQueue = [];
    this.isProcessing = false;
    this.notificationManager = null;
    
    this.initialize();
  }

  async initialize() {
    console.log('🚀 JobScrapper Service Worker initializing...');
    
    await this.loadSettings();
    await this.initializeQueue();
    await this.initializeNotifications();
    this.setupMessageHandlers();
    this.setupPeriodicTasks();
    
    console.log('✅ JobScrapper Service Worker ready');
  }

  async initializeNotifications() {
    try {
      this.notificationManager = await initializeNotifications();
      console.log('🔔 Notification system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  // ============================================================================
  // 1. MESSAGE PASSING SYSTEM
  // ============================================================================

  setupMessageHandlers() {
    // Content Script Communication
    this.messageHandlers.set('JOB_DETECTED', this.handleJobDetected.bind(this));
    this.messageHandlers.set('APPLICATION_START', this.handleApplicationStart.bind(this));
    this.messageHandlers.set('APPLICATION_STEP', this.handleApplicationStep.bind(this));
    this.messageHandlers.set('APPLICATION_COMPLETE', this.handleApplicationComplete.bind(this));
    this.messageHandlers.set('APPLICATION_ERROR', this.handleApplicationError.bind(this));
    
    // Popup Communication
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    this.messageHandlers.set('START_APPLICATION', this.handleStartApplication.bind(this));
    this.messageHandlers.set('PAUSE_APPLICATION', this.handlePauseApplication.bind(this));
    this.messageHandlers.set('GET_QUEUE', this.handleGetQueue.bind(this));
    this.messageHandlers.set('CLEAR_QUEUE', this.handleClearQueue.bind(this));
    
    // Data Sync
    this.messageHandlers.set('SYNC_DATA', this.handleSyncData.bind(this));
    this.messageHandlers.set('GET_ANALYTICS', this.handleGetAnalytics.bind(this));
  }

  setupEventListeners() {
    // Message listener with proper response handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async responses
    });

    // Tab updates for job site detection
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Extension lifecycle
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    chrome.runtime.onStartup.addListener(this.handleStartup.bind(this));
    
    // Storage changes
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        throw new Error(`Unknown message type: ${message.type}`);
      }

      const response = await handler(message.data, sender);
      sendResponse({ success: true, data: response });

    } catch (error) {
      console.error(`Message handling error (${message.type}):`, error);
      sendResponse({ 
        success: false, 
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  // ============================================================================
  // 2. JOB MONITORING & DETECTION
  // ============================================================================

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    const jobSite = this.detectJobSite(tab.url);
    if (!jobSite) return;

    // Inject content script if needed
    await this.ensureContentScript(tabId);
    
    // Notify about job site detection
    await this.sendToTab(tabId, {
      type: 'JOB_SITE_DETECTED',
      data: { platform: jobSite, url: tab.url }
    });

    // Update badge
    await this.updateBadge(tabId, { platform: jobSite });
  }

  detectJobSite(url) {
    const patterns = {
      linkedin: /linkedin\.com\/jobs/,
      indeed: /indeed\.com/,
      glassdoor: /glassdoor\.com/,
      google: /jobs\.google\.com/,
      ziprecruiter: /ziprecruiter\.com/,
      monster: /monster\.com/
    };

    for (const [platform, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) return platform;
    }
    return null;
  }

  async ensureContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      // Content script might already be injected
      console.log('Content script injection skipped:', error.message);
    }
  }

  // ============================================================================
  // 3. APPLICATION QUEUE MANAGEMENT
  // ============================================================================

  async handleJobDetected(data, sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    // Store job data
    await this.storeJobData(data);
    
    // Add to processing queue if auto-apply is enabled
    const settings = await this.getSettings();
    if (settings.autoApply) {
      await this.addToQueue(tabId, data);
    }

    return { queued: settings.autoApply, jobId: data.jobId };
  }

  async addToQueue(tabId, jobData) {
    const queueItem = {
      id: `${tabId}_${Date.now()}`,
      tabId,
      jobData,
      status: 'queued',
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    this.applicationQueue.set(queueItem.id, queueItem);
    
    // Notify popup about queue update
    await this.notifyPopup({
      type: 'QUEUE_UPDATED',
      data: { added: queueItem }
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const [id, item] of this.applicationQueue.entries()) {
        if (item.status !== 'queued') continue;

        await this.processApplication(item);
        
        // Delay between applications for stealth
        await StealthUtils.actionDelay(5000, 10000);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async processApplication(queueItem) {
    const startTime = Date.now();
    queueItem.status = 'processing';
    queueItem.progress = 0;
    
    try {
      // Notify application started
      await this.notifyApplicationEvent('APPLICATION_STARTED', {
        jobTitle: queueItem.jobData?.title,
        company: queueItem.jobData?.company,
        platform: queueItem.jobData?.platform
      });

      // Get user data for auto-fill
      const userData = await this.getUserData();
      
      // Initialize state machine
      const stateMachine = new ApplicationStateMachine({
        enableStealth: true,
        debugMode: false
      });

      // Send to content script for processing
      const result = await this.sendToTab(queueItem.tabId, {
        type: 'START_APPLICATION',
        data: {
          jobData: queueItem.jobData,
          userData,
          queueId: queueItem.id
        }
      });

      if (result.success) {
        queueItem.status = 'completed';
        queueItem.completedAt = Date.now();
        await this.syncApplicationData(queueItem, result.data);
      } else {
        throw new Error(result.error);
      }

      // Update progress during processing
      queueItem.progress = 25;
      await this.updateApplicationProgress(queueItem);

      // ...more processing code...

      queueItem.progress = 50;
      await this.updateApplicationProgress(queueItem);

      // ...complete processing...

      queueItem.status = 'completed';
      queueItem.progress = 100;
      queueItem.completedAt = Date.now();
      queueItem.processingTime = Date.now() - startTime;

      // Notify success
      await this.notifyApplicationEvent('APPLICATION_SUCCESS', {
        jobTitle: queueItem.jobData?.title,
        company: queueItem.jobData?.company,
        platform: queueItem.jobData?.platform,
        appliedAt: new Date().toISOString(),
        processingTime: queueItem.processingTime,
        automatedApplication: true
      });

      console.log('✅ Application completed successfully:', queueItem.id);
      
    } catch (error) {
      queueItem.status = 'failed';
      queueItem.error = error.message;
      queueItem.attempts = (queueItem.attempts || 0) + 1;

      // Notify error
      await this.notifyApplicationEvent('APPLICATION_ERROR', {
        jobTitle: queueItem.jobData?.title,
        company: queueItem.jobData?.company,
        platform: queueItem.jobData?.platform,
        error: { message: error.message },
        attempts: queueItem.attempts,
        maxAttempts: this.settings.maxRetryAttempts || 3
      });

      console.error('❌ Application failed:', queueItem.id, error);
      
      // Retry if within limits
      if (queueItem.attempts < (this.settings.maxRetryAttempts || 3)) {
        queueItem.status = 'queued';
        queueItem.retryAt = Date.now() + (this.settings.retryDelay || 300000); // 5 minutes
        console.log(`🔄 Scheduling retry for ${queueItem.id} (attempt ${queueItem.attempts + 1})`);
      }
    }

    // Notify popup about status change
    await this.notifyPopup({
      type: 'APPLICATION_STATUS',
      data: queueItem
    });
  }

  async processBulkApplications(jobDataArray) {
    const totalJobs = jobDataArray.length;
    let completed = 0;
    let successful = 0;
    let failed = 0;
    const startTime = Date.now();

    // Notify bulk start
    await this.notifyApplicationEvent('BULK_START', { totalJobs });

    for (const jobData of jobDataArray) {
      const queueItem = this.createQueueItem(jobData);
      this.queue.push(queueItem);
      
      try {
        await this.processApplication(queueItem);
        
        if (queueItem.status === 'completed') {
          successful++;
        } else {
          failed++;
        }
        
        completed++;
        
        // Update progress every few applications
        if (completed % Math.ceil(totalJobs / 10) === 0 || completed === totalJobs) {
          await this.notifyApplicationEvent('BULK_PROGRESS', {
            completed,
            total: totalJobs,
            successful,
            failed,
            currentJob: jobData,
            estimatedTimeRemaining: this.calculateEstimatedTime(completed, totalJobs, startTime)
          });
        }

        // Add delay between applications for stealth
        if (completed < totalJobs) {
          const delay = this.calculateStealthDelay();
          await this.sleep(delay);
        }
        
      } catch (error) {
        console.error('❌ Failed to process bulk application:', error);
        failed++;
        completed++;
      }
    }

    const duration = Date.now() - startTime;
    
    // Notify bulk complete
    await this.notifyApplicationEvent('BULK_COMPLETE', {
      total: totalJobs,
      successful,
      failed,
      skipped: totalJobs - successful - failed,
      duration,
      successRate: Math.round((successful / totalJobs) * 100)
    });

    return { totalJobs, successful, failed, duration };
  }

  async notifyApplicationEvent(eventType, data) {
    try {
      await handleApplicationEvent({ type: eventType, data });
    } catch (error) {
      console.error('❌ Failed to handle notification event:', error);
    }
  }

  calculateEstimatedTime(completed, total, startTime) {
    if (completed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const averageTime = elapsed / completed;
    const remaining = total - completed;
    
    return remaining * averageTime;
  }

  async updateApplicationProgress(item) {
    // Broadcast progress update to popup
    await this.broadcastMessage({
      type: MessageTypes.APPLICATION_PROGRESS,
      data: {
        id: item.id,
        progress: item.progress,
        status: item.status
      }
    });
  }

  // ============================================================================
  // 4. DATA SYNCHRONIZATION WITH BACKEND API
  // ============================================================================

  async syncApplicationData(queueItem, applicationResult) {
    const syncData = {
      jobId: queueItem.jobData.jobId,
      jobTitle: queueItem.jobData.title,
      company: queueItem.jobData.company,
      platform: queueItem.jobData.platform,
      status: 'applied',
      automatedApplication: true,
      processingTime: queueItem.completedAt - queueItem.startedAt,
      applicationData: applicationResult,
      appliedAt: new Date().toISOString()
    };

    this.syncQueue.push({
      type: 'APPLICATION',
      data: syncData,
      timestamp: Date.now()
    });

    // Trigger immediate sync
    await this.performSync();
  }

  async performSync() {
    if (this.syncQueue.length === 0) return;

    const settings = await this.getSettings();
    if (!settings.apiEndpoint) return;

    const batch = this.syncQueue.splice(0, 10); // Process in batches
    
    for (const item of batch) {
      try {
        await this.syncToAPI(item);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        // Re-queue failed items
        this.syncQueue.push({
          ...item,
          retryCount: (item.retryCount || 0) + 1
        });
      }
    }
  }

  async syncToAPI(syncItem) {
    const settings = await this.getSettings();
    const endpoint = `${settings.apiEndpoint}/api/applications`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': settings.userId || 'anonymous'
      },
      body: JSON.stringify(syncItem.data)
    });

    if (!response.ok) {
      throw new Error(`API sync failed: ${response.status}`);
    }

    return await response.json();
  }

  // ============================================================================
  // 5. PERIODIC TASKS & MONITORING
  // ============================================================================

  startPeriodicTasks() {
    // Job checking every 30 seconds
    this.jobCheckInterval = setInterval(() => {
      this.checkForNewJobs();
    }, 30000);

    // Data sync every 2 minutes
    setInterval(() => {
      this.performSync();
    }, 120000);

    // Queue cleanup every 10 minutes
    setInterval(() => {
      this.cleanupQueue();
    }, 600000);
  }

  async checkForNewJobs() {
    const tabs = await chrome.tabs.query({ 
      url: ['*://linkedin.com/*', '*://indeed.com/*', '*://glassdoor.com/*'] 
    });

    for (const tab of tabs) {
      const jobSite = this.detectJobSite(tab.url);
      if (jobSite) {
        await this.sendToTab(tab.id, {
          type: 'CHECK_FOR_JOBS',
          data: { timestamp: Date.now() }
        });
      }
    }
  }

  cleanupQueue() {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [id, item] of this.applicationQueue.entries()) {
      if (item.status === 'completed' && item.completedAt < oneHourAgo) {
        this.applicationQueue.delete(id);
      }
    }
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  async handleApplicationStart(data, sender) {
    const tabId = sender.tab?.id;
    const queueItem = Array.from(this.applicationQueue.values())
      .find(item => item.tabId === tabId);
    
    if (queueItem) {
      queueItem.status = 'processing';
    }

    return { acknowledged: true, tabId };
  }

  async handleApplicationComplete(data, sender) {
    await this.syncApplicationData(data.queueItem, data.result);
    return { synced: true };
  }

  async handleGetStatus() {
    return {
      queueLength: this.applicationQueue.size,
      processing: this.isProcessing,
      syncQueue: this.syncQueue.length,
      uptime: Date.now() - this.startTime
    };
  }

  async handleGetQueue() {
    return Array.from(this.applicationQueue.values());
  }

  async handleStartApplication(data) {
    const { tabId, jobData } = data;
    await this.addToQueue(tabId, jobData);
    return { queued: true };
  }

  async handlePauseApplication(data) {
    const queueItem = this.applicationQueue.get(data.queueId);
    if (queueItem) {
      queueItem.status = 'paused';
    }
    return { paused: true };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async sendToTab(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error(`Failed to send message to tab ${tabId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async notifyPopup(message) {
    try {
      await chrome.runtime.sendMessage({
        type: 'TO_POPUP',
        ...message
      });
    } catch (error) {
      // Popup might not be open
      console.log('Popup notification skipped:', error.message);
    }
  }

  async updateBadge(tabId, data) {
    const queueCount = this.applicationQueue.size;
    await chrome.action.setBadgeText({
      text: queueCount > 0 ? queueCount.toString() : '',
      tabId
    });
  }

  async getSettings() {
    const result = await chrome.storage.sync.get([
      'autoApply', 'apiEndpoint', 'userId', 'stealthMode'
    ]);
    
    return {
      autoApply: result.autoApply || false,
      apiEndpoint: result.apiEndpoint || 'http://localhost:5000',
      userId: result.userId || null,
      stealthMode: result.stealthMode !== false
    };
  }

  async getUserData() {
    const result = await chrome.storage.sync.get(['userData']);
    return result.userData || {};
  }

  async storeJobData(jobData) {
    const jobs = await chrome.storage.local.get(['scrapedJobs']);
    const scrapedJobs = jobs.scrapedJobs || [];
    
    scrapedJobs.push({
      ...jobData,
      scrapedAt: Date.now()
    });

    await chrome.storage.local.set({ 
      scrapedJobs: scrapedJobs.slice(-1000) // Keep last 1000 jobs
    });
  }

  async handleInstall() {
    this.startTime = Date.now();
    await chrome.storage.sync.set({
      autoApply: false,
      stealthMode: true,
      apiEndpoint: 'http://localhost:5000'
    });
    console.log('✅ JobScrapper installed successfully');
  }

  async handleStartup() {
    this.startTime = Date.now();
    console.log('🔄 JobScrapper service worker started');
  }

  async handleStorageChange(changes, areaName) {
    if (areaName === 'sync' && changes.autoApply) {
      console.log('Auto-apply setting changed:', changes.autoApply.newValue);
    }
  }
}

// Initialize the service worker
const jobScrapperService = new JobScrapperService();

// Export for testing
export { JobScrapperService };
