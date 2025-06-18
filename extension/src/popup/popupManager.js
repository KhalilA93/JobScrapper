// JobScrapper Popup Communication Example
// Demonstrates UI interaction with background service worker

import { MessageHelper, MessageTypes } from '../utils/messageProtocol.js';

/**
 * Popup Manager for JobScrapper Extension
 * Handles UI interactions and service worker communication
 */
class PopupManager {
  constructor() {
    this.status = null;
    this.queue = [];
    this.initialize();
  }

  async initialize() {
    await this.loadStatus();
    this.setupEventListeners();
    this.setupAutoRefresh();
    console.log('🖥️ Popup communication initialized');
  }

  // ============================================================================
  // STATUS & DATA LOADING
  // ============================================================================

  async loadStatus() {
    try {
      this.status = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_STATUS
      });
      
      this.queue = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_QUEUE
      });

      this.updateUI();
    } catch (error) {
      this.showError('Failed to load status: ' + error.message);
    }
  }

  setupAutoRefresh() {
    // Refresh status every 5 seconds
    setInterval(() => {
      this.loadStatus();
    }, 5000);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  setupEventListeners() {
    // Start/Stop auto-apply
    document.getElementById('toggleAutoApply')?.addEventListener('click', () => {
      this.toggleAutoApply();
    });

    // Manual application start
    document.getElementById('startApplication')?.addEventListener('click', () => {
      this.startManualApplication();
    });

    // Clear queue
    document.getElementById('clearQueue')?.addEventListener('click', () => {
      this.clearQueue();
    });

    // Sync now
    document.getElementById('syncNow')?.addEventListener('click', () => {
      this.syncData();
    });

    // View analytics
    document.getElementById('viewAnalytics')?.addEventListener('click', () => {
      this.showAnalytics();
    });

    // Listen for background messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MessageTypes.TO_POPUP) {
        this.handleBackgroundMessage(message);
      }
    });
  }

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  async toggleAutoApply() {
    try {
      const currentSetting = await this.getAutoApplySetting();
      const newSetting = !currentSetting;
      
      await chrome.storage.sync.set({ autoApply: newSetting });
      
      this.showNotification(
        newSetting ? '✅ Auto-apply enabled' : '⏸️ Auto-apply disabled'
      );
      
      this.updateToggleButton(newSetting);
    } catch (error) {
      this.showError('Failed to toggle auto-apply: ' + error.message);
    }
  }

  async startManualApplication() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get user data
      const userData = await this.getUserData();
      if (!userData.firstName || !userData.email) {
        this.showSetupPrompt();
        return;
      }

      // Start application
      await MessageHelper.sendToBackground({
        type: MessageTypes.START_APPLICATION,
        data: {
          tabId: tab.id,
          manual: true
        }
      });

      this.showNotification('🚀 Application started');
      
    } catch (error) {
      this.showError('Failed to start application: ' + error.message);
    }
  }

  async clearQueue() {
    try {
      await MessageHelper.sendToBackground({
        type: MessageTypes.CLEAR_QUEUE
      });
      
      this.showNotification('🗑️ Queue cleared');
      await this.loadStatus();
      
    } catch (error) {
      this.showError('Failed to clear queue: ' + error.message);
    }
  }

  async syncData() {
    try {
      await MessageHelper.sendToBackground({
        type: MessageTypes.SYNC_DATA
      });
      
      this.showNotification('🔄 Data sync initiated');
      
    } catch (error) {
      this.showError('Failed to sync data: ' + error.message);
    }
  }

  async showAnalytics() {
    try {
      const analytics = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_ANALYTICS
      });
      
      this.displayAnalytics(analytics);
      
    } catch (error) {
      this.showError('Failed to load analytics: ' + error.message);
    }
  }

  // ============================================================================
  // UI UPDATES
  // ============================================================================

  updateUI() {
    this.updateStatusSection();
    this.updateQueueSection();
    this.updateStatsSection();
  }

  updateStatusSection() {
    const statusEl = document.getElementById('status');
    if (!statusEl || !this.status) return;

    const isProcessing = this.status.processing;
    const queueLength = this.status.queueLength;

    statusEl.innerHTML = `
      <div class="status-item">
        <span class="status-label">Status:</span>
        <span class="status-value ${isProcessing ? 'processing' : 'idle'}">
          ${isProcessing ? '🔄 Processing' : '⏸️ Idle'}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Queue:</span>
        <span class="status-value">${queueLength} jobs</span>
      </div>
      <div class="status-item">
        <span class="status-label">Sync Queue:</span>
        <span class="status-value">${this.status.syncQueue} items</span>
      </div>
      <div class="status-item">
        <span class="status-label">Uptime:</span>
        <span class="status-value">${this.formatUptime(this.status.uptime)}</span>
      </div>
    `;
  }

  updateQueueSection() {
    const queueEl = document.getElementById('queueList');
    if (!queueEl) return;

    if (this.queue.length === 0) {
      queueEl.innerHTML = '<div class="empty-state">No jobs in queue</div>';
      return;
    }

    queueEl.innerHTML = this.queue.map(item => `
      <div class="queue-item ${item.status}">
        <div class="job-info">
          <div class="job-title">${item.jobData.title}</div>
          <div class="job-company">${item.jobData.company}</div>
          <div class="job-platform">${item.jobData.platform}</div>
        </div>
        <div class="job-status">
          <span class="status-badge ${item.status}">${this.formatStatus(item.status)}</span>
          ${item.status === 'processing' ? this.getProgressBar(item) : ''}
        </div>
        <div class="job-actions">
          ${this.getQueueItemActions(item)}
        </div>
      </div>
    `).join('');
  }

  updateStatsSection() {
    const statsEl = document.getElementById('stats');
    if (!statsEl || !this.status.stats) return;

    const stats = this.status.stats;
    statsEl.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${stats.totalProcessed || 0}</div>
        <div class="stat-label">Total Processed</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${(stats.successRate || 0).toFixed(1)}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${this.formatTime(stats.averageTime || 0)}</div>
        <div class="stat-label">Avg Time</div>
      </div>
    `;
  }

  handleBackgroundMessage(message) {
    switch (message.type) {
      case MessageTypes.QUEUE_UPDATED:
        this.loadStatus();
        this.showNotification('Queue updated');
        break;
        
      case MessageTypes.APPLICATION_STATUS:
        this.updateApplicationStatus(message.data);
        break;
        
      default:
        console.log('Unknown background message:', message);
    }
  }

  updateApplicationStatus(applicationData) {
    const notification = this.getStatusNotification(applicationData);
    if (notification) {
      this.showNotification(notification);
    }
    
    // Refresh queue display
    this.loadStatus();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getAutoApplySetting() {
    const result = await chrome.storage.sync.get(['autoApply']);
    return result.autoApply || false;
  }

  async getUserData() {
    const result = await chrome.storage.sync.get(['userData']);
    return result.userData || {};
  }

  updateToggleButton(enabled) {
    const button = document.getElementById('toggleAutoApply');
    if (button) {
      button.textContent = enabled ? 'Disable Auto-Apply' : 'Enable Auto-Apply';
      button.className = enabled ? 'button-primary' : 'button-secondary';
    }
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatStatus(status) {
    const statusMap = {
      'queued': '⏳ Queued',
      'processing': '🔄 Processing',
      'completed': '✅ Completed',
      'failed': '❌ Failed',
      'paused': '⏸️ Paused'
    };
    return statusMap[status] || status;
  }

  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return seconds > 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  }

  getProgressBar(item) {
    const progress = item.progress || 0;
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-text">${progress}%</div>
    `;
  }

  getQueueItemActions(item) {
    switch (item.status) {
      case 'processing':
        return '<button class="button-small" onclick="pauseApplication(\'' + item.id + '\')">Pause</button>';
      case 'paused':
        return '<button class="button-small" onclick="resumeApplication(\'' + item.id + '\')">Resume</button>';
      case 'failed':
        return '<button class="button-small" onclick="retryApplication(\'' + item.id + '\')">Retry</button>';
      default:
        return '<button class="button-small" onclick="removeFromQueue(\'' + item.id + '\')">Remove</button>';
    }
  }

  getStatusNotification(data) {
    switch (data.status) {
      case 'completed': return `✅ Applied to ${data.jobData?.title} at ${data.jobData?.company}`;
      case 'failed': return `❌ Failed to apply to ${data.jobData?.title}: ${data.lastError}`;
      case 'processing': return `🔄 Processing application for ${data.jobData?.title}`;
      default: return null;
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  showError(message) {
    console.error(message);
    this.showNotification('❌ ' + message);
  }

  showSetupPrompt() {
    const setupMsg = 'Please configure your profile in extension settings first.';
    this.showNotification('⚙️ ' + setupMsg);
  }

  displayAnalytics(analytics) {
    // Brief implementation - could open detailed analytics view
    console.log('Analytics data:', analytics);
    this.showNotification('📊 Analytics loaded (check console)');
  }
}

// Initialize popup manager when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

export { PopupManager };
