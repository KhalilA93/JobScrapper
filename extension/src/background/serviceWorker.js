// JobScrapper Background Service Worker - Modern Chrome Extension Implementation
// Handles message passing, job monitoring, application queue, and API synchronization

import { ApplicationStateMachine } from '../utils/applicationStateMachine.js';
import { AutoFillSystem } from '../utils/autoFillSystem.js';
import { StealthUtils } from '../utils/stealthUtils.js';

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
    
    this.initialize();
  }

  initialize() {
    this.setupMessageHandlers();
    this.setupEventListeners();
    this.startPeriodicTasks();
    console.log('🚀 JobScrapper Service Worker initialized');
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
    try {
      queueItem.status = 'processing';
      queueItem.startedAt = Date.now();

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

    } catch (error) {
      queueItem.attempts++;
      queueItem.lastError = error.message;

      if (queueItem.attempts >= queueItem.maxAttempts) {
        queueItem.status = 'failed';
      } else {
        queueItem.status = 'queued'; // Retry
      }

      console.error(`Application processing failed:`, error);
    }

    // Notify popup about status change
    await this.notifyPopup({
      type: 'APPLICATION_STATUS',
      data: queueItem
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
