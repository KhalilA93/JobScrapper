// Popup JavaScript - handles UI interactions and Chrome extension API calls

class JobScrapperPopup {
  constructor() {
    this.currentTab = 'dashboard';
    this.stats = {
      totalJobs: 0,
      appliedToday: 0,
      successRate: 0
    };
    
    this.init();
  }

  async init() {
    // Initialize UI
    this.setupEventListeners();
    this.setupTabNavigation();
    
    // Load data
    await this.loadSettings();
    await this.loadUserProfile();
    await this.loadStats();
    await this.checkCurrentSite();
    
    // Update UI
    this.updateDashboard();
  }

  setupEventListeners() {
    // Dashboard buttons
    document.getElementById('scan-btn').addEventListener('click', () => this.scanJobs());
    document.getElementById('auto-apply-btn').addEventListener('click', () => this.startAutoApply());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopProcess());

    // Settings buttons
    document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-settings-btn').addEventListener('click', () => this.resetSettings());

    // Profile buttons
    document.getElementById('save-profile-btn').addEventListener('click', () => this.saveUserProfile());
    document.getElementById('test-autofill-btn').addEventListener('click', () => this.testAutofill());
  }

  setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update navigation
        navButtons.forEach(nav => nav.classList.remove('active'));
        button.classList.add('active');
        
        // Update tab content
        tabContents.forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        this.currentTab = targetTab;
      });
    });
  }

  async checkCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const hostname = url.hostname.toLowerCase();
        
        let platform = 'Unknown';
        let isSupported = false;
        
        if (hostname.includes('linkedin.com')) {
          platform = 'LinkedIn';
          isSupported = true;
        } else if (hostname.includes('indeed.com')) {
          platform = 'Indeed';
          isSupported = true;
        } else if (hostname.includes('glassdoor.com')) {
          platform = 'Glassdoor';
          isSupported = true;
        } else if (hostname.includes('jobs.google.com')) {
          platform = 'Google Jobs';
          isSupported = true;
        } else if (hostname.includes('ziprecruiter.com')) {
          platform = 'ZipRecruiter';
          isSupported = true;
        } else if (hostname.includes('monster.com')) {
          platform = 'Monster';
          isSupported = true;
        }
        
        // Update UI
        document.getElementById('current-platform').textContent = platform;
        const statusEl = document.getElementById('site-status');
        statusEl.textContent = isSupported ? 'Supported' : 'Not supported';
        statusEl.className = `site-status ${isSupported ? 'supported' : 'not-supported'}`;
        
        // Enable/disable action buttons
        const scanBtn = document.getElementById('scan-btn');
        const autoApplyBtn = document.getElementById('auto-apply-btn');
        
        if (isSupported) {
          scanBtn.disabled = false;
          autoApplyBtn.disabled = false;
          this.updateStatus('Ready', 'ready');
        } else {
          scanBtn.disabled = true;
          autoApplyBtn.disabled = true;
          this.updateStatus('Unsupported site', 'warning');
        }
      }
    } catch (error) {
      console.error('Error checking current site:', error);
      this.updateStatus('Error', 'error');
    }
  }

  updateStatus(text, type = 'ready') {
    document.getElementById('status-text').textContent = text;
    
    const statusDot = document.querySelector('.status-dot');
    statusDot.className = `status-dot ${type}`;
  }

  async scanJobs() {
    try {
      this.updateStatus('Scanning jobs...', 'warning');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getJobCount'
      });
      
      if (response && response.count !== undefined) {
        this.stats.totalJobs = response.count;
        this.updateDashboard();
        this.updateStatus(`Found ${response.count} jobs`, 'ready');
        
        // Add to activity log
        this.addActivity(`Scanned ${response.count} jobs`);
      } else {
        this.updateStatus('No jobs found', 'warning');
      }
    } catch (error) {
      console.error('Error scanning jobs:', error);
      this.updateStatus('Scan failed', 'error');
    }
  }

  async startAutoApply() {
    try {
      this.updateStatus('Starting auto-apply...', 'warning');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Disable buttons
      document.getElementById('scan-btn').disabled = true;
      document.getElementById('auto-apply-btn').disabled = true;
      document.getElementById('stop-btn').disabled = false;
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'processQueue'
      });
      
      if (response && response.success) {
        this.updateStatus('Auto-applying...', 'warning');
        this.addActivity('Started auto-apply process');
      } else {
        this.updateStatus('Failed to start', 'error');
        this.resetButtons();
      }
    } catch (error) {
      console.error('Error starting auto-apply:', error);
      this.updateStatus('Start failed', 'error');
      this.resetButtons();
    }
  }

  async stopProcess() {
    try {
      this.updateStatus('Stopping...', 'warning');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'stop'
      });
      
      this.updateStatus('Stopped', 'ready');
      this.resetButtons();
      this.addActivity('Stopped auto-apply process');
    } catch (error) {
      console.error('Error stopping process:', error);
      this.updateStatus('Stop failed', 'error');
    }
  }

  resetButtons() {
    document.getElementById('scan-btn').disabled = false;
    document.getElementById('auto-apply-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
  }

  async loadSettings() {
    try {
      const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });
      
      if (settings) {
        document.getElementById('auto-apply-enabled').checked = settings.autoApply || false;
        document.getElementById('max-applications').value = settings.maxApplicationsPerDay || 50;
        document.getElementById('application-delay').value = (settings.delayBetweenApplications || 5000) / 1000;
        document.getElementById('target-positions').value = (settings.targetPositions || []).join(', ');
        document.getElementById('exclude-keywords').value = (settings.excludeKeywords || []).join(', ');
        document.getElementById('preferred-locations').value = (settings.locations || []).join(', ');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        autoApply: document.getElementById('auto-apply-enabled').checked,
        maxApplicationsPerDay: parseInt(document.getElementById('max-applications').value),
        delayBetweenApplications: parseInt(document.getElementById('application-delay').value) * 1000,
        targetPositions: document.getElementById('target-positions').value.split(',').map(s => s.trim()).filter(s => s),
        excludeKeywords: document.getElementById('exclude-keywords').value.split(',').map(s => s.trim()).filter(s => s),
        locations: document.getElementById('preferred-locations').value.split(',').map(s => s.trim()).filter(s => s),
        enabled: true
      };
      
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        data: settings
      });
      
      this.showNotification('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  async resetSettings() {
    try {
      const defaultSettings = {
        autoApply: false,
        maxApplicationsPerDay: 50,
        delayBetweenApplications: 5000,
        targetPositions: ['Software Engineer', 'Developer', 'Frontend', 'Backend'],
        excludeKeywords: ['senior', 'lead', 'manager'],
        locations: ['Remote', 'New York', 'San Francisco'],
        enabled: true
      };
      
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        data: defaultSettings
      });
      
      await this.loadSettings();
      this.showNotification('Settings reset to default');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showNotification('Error resetting settings', 'error');
    }
  }

  async loadUserProfile() {
    try {
      const profile = await chrome.runtime.sendMessage({ action: 'getUserProfile' });
      
      if (profile) {
        document.getElementById('profile-name').value = profile.name || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-phone').value = profile.phone || '';
        document.getElementById('profile-linkedin').value = profile.linkedinProfile || '';
        document.getElementById('profile-github').value = profile.githubProfile || '';
        document.getElementById('profile-resume').value = profile.resumeUrl || '';
        document.getElementById('profile-cover-letter').value = profile.coverLetter || '';
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async saveUserProfile() {
    try {
      const profile = {
        name: document.getElementById('profile-name').value,
        email: document.getElementById('profile-email').value,
        phone: document.getElementById('profile-phone').value,
        linkedinProfile: document.getElementById('profile-linkedin').value,
        githubProfile: document.getElementById('profile-github').value,
        resumeUrl: document.getElementById('profile-resume').value,
        coverLetter: document.getElementById('profile-cover-letter').value
      };
      
      await chrome.runtime.sendMessage({
        action: 'updateUserProfile',
        data: profile
      });
      
      this.showNotification('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving user profile:', error);
      this.showNotification('Error saving profile', 'error');
    }
  }

  async testAutofill() {
    try {
      this.showNotification('Testing autofill... Check the current page');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'testAutofill'
      });
    } catch (error) {
      console.error('Error testing autofill:', error);
      this.showNotification('Test failed', 'error');
    }
  }

  async loadStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (stats) {
        this.stats = {
          totalJobs: stats.totalApplications || 0,
          appliedToday: stats.successfulApplications || 0,
          successRate: stats.totalApplications > 0 
            ? Math.round((stats.successfulApplications / stats.totalApplications) * 100)
            : 0
        };
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  updateDashboard() {
    document.getElementById('total-jobs').textContent = this.stats.totalJobs;
    document.getElementById('applied-today').textContent = this.stats.appliedToday;
    document.getElementById('success-rate').textContent = `${this.stats.successRate}%`;
  }

  addActivity(message) {
    const activityList = document.getElementById('activity-list');
    const timestamp = new Date().toLocaleTimeString();
    
    // Remove "No recent activity" message if present
    if (activityList.children.length === 1 && 
        activityList.children[0].textContent.includes('No recent activity')) {
      activityList.innerHTML = '';
    }
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
      <span class="activity-time">${timestamp}</span>
      <div>${message}</div>
    `;
    
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Keep only last 5 activities
    while (activityList.children.length > 5) {
      activityList.removeChild(activityList.lastChild);
    }
  }

  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      transition: all 0.3s ease;
      ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
      ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JobScrapperPopup();
});
