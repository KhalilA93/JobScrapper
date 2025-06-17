import { storageManager } from '@utils/storage';
import { jobDetector } from '@utils/jobDetector';
import { apiClient } from '@utils/apiClient';

class BackgroundService {
  constructor() {
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.startJobMonitoring();
  }

  setupEventListeners() {
    // Tab update listener for job site detection
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Extension install/startup
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    
    // Message handling from content scripts
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const jobSite = jobDetector.detectJobSite(tab.url);
      
      if (jobSite) {
        await this.injectContentScript(tabId);
        await this.notifyJobSiteDetected(tabId, jobSite);
      }
    }
  }

  async handleInstall() {
    await storageManager.initializeStorage();
    console.log('JobScrapper extension installed');
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'JOB_DETECTED':
          await this.processDetectedJob(request.data);
          break;
        case 'APPLICATION_SUBMITTED':
          await this.processApplication(request.data);
          break;
        case 'GET_USER_SETTINGS':
          const settings = await storageManager.getUserSettings();
          sendResponse(settings);
          break;
        default:
          console.warn('Unknown message type:', request.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }

  async notifyJobSiteDetected(tabId, jobSite) {
    await chrome.tabs.sendMessage(tabId, {
      type: 'JOB_SITE_DETECTED',
      data: { platform: jobSite }
    });
  }

  async processDetectedJob(jobData) {
    try {
      await apiClient.saveJob(jobData);
      await storageManager.addJob(jobData);
    } catch (error) {
      console.error('Error processing job:', error);
    }
  }

  async processApplication(applicationData) {
    try {
      await apiClient.saveApplication(applicationData);
      await storageManager.addApplication(applicationData);
      
      // Send notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Application Submitted',
        message: `Applied to ${applicationData.jobTitle} at ${applicationData.company}`
      });
    } catch (error) {
      console.error('Error processing application:', error);
    }
  }

  startJobMonitoring() {
    // Periodic job monitoring can be added here
    setInterval(() => {
      this.checkForNewJobs();
    }, 300000); // Check every 5 minutes
  }

  async checkForNewJobs() {
    // Implementation for periodic job checking
    console.log('Checking for new jobs...');
  }
}

// Initialize background service
new BackgroundService();
