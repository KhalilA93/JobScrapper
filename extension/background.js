// Background script for Chrome extension
// Handles global state, communication between scripts, and API calls

class JobScrapperBackground {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api';
    this.init();
  }

  init() {
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
    chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
    
    // Set up periodic job application checking
    chrome.alarms.create('checkJobQueue', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener(this.onAlarm.bind(this));
  }

  onInstalled(details) {
    console.log('JobScrapper extension installed');
    
    // Initialize default settings
    chrome.storage.sync.set({
      settings: {
        autoApply: false,
        maxApplicationsPerDay: 50,
        delayBetweenApplications: 5000, // 5 seconds
        targetPositions: ['Software Engineer', 'Developer', 'Frontend', 'Backend'],
        excludeKeywords: ['senior', 'lead', 'manager'],
        locations: ['Remote', 'New York', 'San Francisco'],
        enabled: true
      },
      userProfile: {
        name: '',
        email: '',
        phone: '',
        resumeUrl: '',
        coverLetter: '',
        linkedinProfile: '',
        githubProfile: ''
      },
      stats: {
        totalApplications: 0,
        successfulApplications: 0,
        failedApplications: 0,
        lastRunDate: null
      }
    });
  }

  async onMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'scrapeJobs':
          return await this.scrapeJobs(request.data);
        
        case 'applyToJob':
          return await this.applyToJob(request.data);
        
        case 'saveJobData':
          return await this.saveJobData(request.data);
        
        case 'getSettings':
          return await this.getSettings();
        
        case 'updateSettings':
          return await this.updateSettings(request.data);
        
        case 'getUserProfile':
          return await this.getUserProfile();
        
        case 'updateUserProfile':
          return await this.updateUserProfile(request.data);
        
        case 'getStats':
          return await this.getStats();
        
        case 'checkJobMatch':
          return await this.checkJobMatch(request.data);
        
        default:
          console.log('Unknown action:', request.action);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Background script error:', error);
      return { success: false, error: error.message };
    }
  }

  onTabUpdated(tabId, changeInfo, tab) {
    // Detect when user navigates to supported job sites
    if (changeInfo.status === 'complete' && tab.url) {
      const supportedSites = [
        'linkedin.com',
        'indeed.com',
        'glassdoor.com',
        'jobs.google.com',
        'ziprecruiter.com',
        'monster.com'
      ];

      const isSupportedSite = supportedSites.some(site => tab.url.includes(site));
      
      if (isSupportedSite) {
        // Inject the content script if not already present
        chrome.tabs.sendMessage(tabId, { action: 'checkPresence' })
          .catch(() => {
            // Content script not present, inject it
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            });
          });
      }
    }
  }

  async onAlarm(alarm) {
    if (alarm.name === 'checkJobQueue') {
      await this.processJobQueue();
    }
  }

  async scrapeJobs(data) {
    try {
      // Send scraped job data to backend
      const response = await fetch(`${this.apiUrl}/jobs/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error scraping jobs:', error);
      return { success: false, error: error.message };
    }
  }

  async applyToJob(jobData) {
    try {
      // Log application attempt
      const response = await fetch(`${this.apiUrl}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobData.id,
          jobTitle: jobData.title,
          company: jobData.company,
          location: jobData.location,
          platform: jobData.platform,
          status: 'applied',
          appliedAt: new Date().toISOString()
        })
      });
      
      const result = await response.json();
      
      // Update local stats
      await this.updateStats('application');
      
      return result;
    } catch (error) {
      console.error('Error applying to job:', error);
      await this.updateStats('failed');
      return { success: false, error: error.message };
    }
  }

  async saveJobData(jobData) {
    try {
      const response = await fetch(`${this.apiUrl}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error saving job data:', error);
      return { success: false, error: error.message };
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        resolve(result.settings || {});
      });
    });
  }

  async updateSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings }, () => {
        resolve({ success: true });
      });
    });
  }

  async getUserProfile() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['userProfile'], (result) => {
        resolve(result.userProfile || {});
      });
    });
  }

  async updateUserProfile(profile) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ userProfile: profile }, () => {
        resolve({ success: true });
      });
    });
  }

  async getStats() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['stats'], (result) => {
        resolve(result.stats || {});
      });
    });
  }

  async updateStats(type) {
    const stats = await this.getStats();
    
    switch (type) {
      case 'application':
        stats.totalApplications = (stats.totalApplications || 0) + 1;
        stats.successfulApplications = (stats.successfulApplications || 0) + 1;
        break;
      case 'failed':
        stats.totalApplications = (stats.totalApplications || 0) + 1;
        stats.failedApplications = (stats.failedApplications || 0) + 1;
        break;
    }
    
    stats.lastRunDate = new Date().toISOString();
    
    chrome.storage.sync.set({ stats });
  }

  async checkJobMatch(jobData) {
    const settings = await this.getSettings();
    
    // Check if job matches user criteria
    const titleMatch = settings.targetPositions?.some(pos => 
      jobData.title.toLowerCase().includes(pos.toLowerCase())
    );
    
    const excludeMatch = settings.excludeKeywords?.some(keyword => 
      jobData.title.toLowerCase().includes(keyword.toLowerCase()) ||
      jobData.description?.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const locationMatch = !settings.locations?.length || 
      settings.locations.some(loc => 
        jobData.location?.toLowerCase().includes(loc.toLowerCase())
      );
    
    return {
      match: titleMatch && !excludeMatch && locationMatch,
      titleMatch,
      excludeMatch,
      locationMatch
    };
  }

  async processJobQueue() {
    // This would process queued job applications
    const settings = await this.getSettings();
    
    if (!settings.enabled || !settings.autoApply) {
      return;
    }
    
    // Get active tab and check if it's a job site
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'processQueue' })
        .catch(() => {
          // Content script not present, ignore
        });
    }
  }
}

// Initialize the background script
new JobScrapperBackground();
