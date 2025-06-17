import { storageManager } from '@utils/storage';
import { apiClient } from '@utils/apiClient';

class PopupController {
  constructor() {
    this.currentTab = null;
    this.platform = null;
    this.initialize();
  }

  async initialize() {
    await this.getCurrentTab();
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.startStatusUpdates();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    this.detectPlatform();
  }

  detectPlatform() {
    if (!this.currentTab?.url) return;

    const hostname = new URL(this.currentTab.url).hostname;
    
    if (hostname.includes('linkedin.com')) this.platform = 'LinkedIn';
    else if (hostname.includes('indeed.com')) this.platform = 'Indeed';
    else if (hostname.includes('glassdoor.com')) this.platform = 'Glassdoor';
    else if (hostname.includes('jobs.google.com')) this.platform = 'Google Jobs';
    else if (hostname.includes('ziprecruiter.com')) this.platform = 'ZipRecruiter';
    else if (hostname.includes('monster.com')) this.platform = 'Monster';
  }

  async loadSettings() {
    const settings = await storageManager.getUserSettings();
    
    document.getElementById('autoApplyEnabled').checked = settings.autoApply || false;
    document.getElementById('dailyLimit').value = settings.dailyLimit || 5;
  }

  setupEventListeners() {
    // Scan jobs button
    document.getElementById('scrapeButton').addEventListener('click', () => {
      this.handleScrapeJobs();
    });

    // Auto apply button
    document.getElementById('autoApplyButton').addEventListener('click', () => {
      this.handleAutoApply();
    });

    // Settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
      this.openSettings();
    });

    // Auto apply toggle
    document.getElementById('autoApplyEnabled').addEventListener('change', (e) => {
      this.updateSetting('autoApply', e.target.checked);
    });

    // Daily limit input
    document.getElementById('dailyLimit').addEventListener('change', (e) => {
      this.updateSetting('dailyLimit', parseInt(e.target.value));
    });

    // Dashboard link
    document.getElementById('dashboardLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openDashboard();
    });
  }

  async handleScrapeJobs() {
    if (!this.currentTab) return;

    this.updateStatus('Scanning jobs...', 'processing');
    
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'SCRAPE_JOBS'
      });
      
      this.updateStatus('Scan complete', 'success');
      await this.updateStats();
    } catch (error) {
      console.error('Scrape error:', error);
      this.updateStatus('Scan failed', 'error');
    }
  }

  async handleAutoApply() {
    if (!this.currentTab) return;

    const settings = await storageManager.getUserSettings();
    
    if (!settings.autoApply) {
      this.updateStatus('Auto apply is disabled', 'warning');
      return;
    }

    this.updateStatus('Auto applying...', 'processing');
    
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'AUTO_APPLY',
        data: settings
      });
      
      this.updateStatus('Application submitted', 'success');
      await this.updateStats();
    } catch (error) {
      console.error('Auto apply error:', error);
      this.updateStatus('Auto apply failed', 'error');
    }
  }

  updateStatus(text, type = 'ready') {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    
    statusText.textContent = text;
    statusIndicator.className = `status-indicator ${type}`;
  }

  updateUI() {
    // Update platform info
    document.getElementById('currentPlatform').textContent = this.platform || 'None detected';
    
    // Enable/disable buttons based on platform
    const hasValidPlatform = !!this.platform;
    document.getElementById('scrapeButton').disabled = !hasValidPlatform;
    document.getElementById('autoApplyButton').disabled = !hasValidPlatform;
  }

  async updateStats() {
    try {
      const stats = await storageManager.getStats();
      document.getElementById('jobsFound').textContent = stats.jobsFound || 0;
      document.getElementById('applicationsCount').textContent = stats.applications || 0;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async updateSetting(key, value) {
    try {
      await storageManager.updateUserSettings({ [key]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }

  openSettings() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }

  openDashboard() {
    chrome.tabs.create({
      url: 'http://localhost:3000'
    });
  }

  startStatusUpdates() {
    setInterval(async () => {
      await this.updateStats();
    }, 5000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
