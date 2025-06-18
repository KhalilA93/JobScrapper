// JobScrapper React Popup Component
// Modern React implementation with hooks and clean component structure

import React, { useState, useEffect, useCallback } from 'react';
import { MessageHelper, MessageTypes } from '../utils/messageProtocol.js';
import NotificationSettings from './NotificationSettings.jsx';

// ============================================================================
// MAIN POPUP COMPONENT
// ============================================================================

const JobScrapperPopup = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    setupMessageListener();
  }, []);

  const loadInitialData = async () => {
    try {
      const statusData = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_STATUS
      });
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = () => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MessageTypes.TO_POPUP) {
        handleBackgroundMessage(message);
      }
    });
  };

  const handleBackgroundMessage = (message) => {
    switch (message.type) {
      case MessageTypes.QUEUE_UPDATED:
      case MessageTypes.APPLICATION_STATUS:
        loadInitialData();
        break;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard status={status} onRefresh={loadInitialData} />;
      case 'profile':
        return <ProfileManager />;
      case 'settings':
        return <SettingsPanel />;
      case 'history':
        return <ApplicationHistory />;
      default:
        return <Dashboard status={status} onRefresh={loadInitialData} />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="popup-container">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="popup-content">
        {renderTabContent()}
      </main>
    </div>
  );
};

// ============================================================================
// 1. JOB APPLICATION DASHBOARD
// ============================================================================

const Dashboard = ({ status, onRefresh }) => {
  const [queue, setQueue] = useState([]);
  const [autoApply, setAutoApply] = useState(false);

  useEffect(() => {
    loadQueue();
    loadSettings();
  }, []);

  const loadQueue = async () => {
    try {
      const queueData = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_QUEUE
      });
      setQueue(queueData || []);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadSettings = async () => {
    const result = await chrome.storage.sync.get(['autoApply']);
    setAutoApply(result.autoApply || false);
  };

  const toggleAutoApply = async () => {
    const newValue = !autoApply;
    await chrome.storage.sync.set({ autoApply: newValue });
    setAutoApply(newValue);
  };

  const startManualApplication = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await MessageHelper.sendToBackground({
        type: MessageTypes.START_APPLICATION,
        data: { tabId: tab.id, manual: true }
      });
    } catch (error) {
      console.error('Failed to start application:', error);
    }
  };

  const clearQueue = async () => {
    try {
      await MessageHelper.sendToBackground({
        type: MessageTypes.CLEAR_QUEUE
      });
      setQueue([]);
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  };

  return (
    <div className="dashboard">
      <StatusIndicators status={status} />
      
      <div className="controls-section">
        <div className="auto-apply-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={toggleAutoApply}
            />
            <span className="toggle-slider"></span>
            Auto-Apply
          </label>
        </div>
        
        <div className="action-buttons">
          <button 
            className="btn-primary"
            onClick={startManualApplication}
          >
            Apply to Current Job
          </button>
          <button 
            className="btn-secondary"
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      <QueueSection 
        queue={queue} 
        onClear={clearQueue}
        onRefresh={loadQueue}
      />
    </div>
  );
};

const StatusIndicators = ({ status }) => {
  if (!status) return <div className="status-loading">Loading status...</div>;

  const getStatusColor = (isProcessing) => isProcessing ? '#ff9500' : '#00d4aa';
  const getStatusText = (isProcessing) => isProcessing ? 'Processing' : 'Ready';

  return (
    <div className="status-indicators">
      <div className="status-item">
        <div 
          className="status-dot"
          style={{ backgroundColor: getStatusColor(status.processing) }}
        ></div>
        <span className="status-text">{getStatusText(status.processing)}</span>
      </div>
      
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{status.queueLength}</span>
          <span className="stat-label">In Queue</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{status.syncQueue}</span>
          <span className="stat-label">Pending Sync</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{formatUptime(status.uptime)}</span>
          <span className="stat-label">Uptime</span>
        </div>
      </div>
    </div>
  );
};

const QueueSection = ({ queue, onClear, onRefresh }) => {
  const [filter, setFilter] = useState('all');

  const filteredQueue = queue.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const statusCounts = queue.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="queue-section">
      <div className="queue-header">
        <h3>Application Queue ({queue.length})</h3>
        <div className="queue-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All ({queue.length})</option>
            <option value="queued">Queued ({statusCounts.queued || 0})</option>
            <option value="processing">Processing ({statusCounts.processing || 0})</option>
            <option value="completed">Completed ({statusCounts.completed || 0})</option>
            <option value="failed">Failed ({statusCounts.failed || 0})</option>
          </select>
          <button className="btn-small" onClick={onRefresh}>Refresh</button>
          <button className="btn-small btn-danger" onClick={onClear}>Clear</button>
        </div>
      </div>

      <div className="queue-list">
        {filteredQueue.length === 0 ? (
          <div className="empty-state">No applications in queue</div>
        ) : (
          filteredQueue.map(item => (
            <QueueItem key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

const QueueItem = ({ item }) => {
  const getStatusIcon = (status) => {
    const icons = {
      queued: '⏳',
      processing: '🔄',
      completed: '✅',
      failed: '❌',
      paused: '⏸️'
    };
    return icons[status] || '❓';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className={`queue-item ${item.status}`}>
      <div className="job-info">
        <div className="job-title">{item.jobData?.title || 'Unknown Job'}</div>
        <div className="job-meta">
          <span className="company">{item.jobData?.company}</span>
          <span className="platform">{item.jobData?.platform}</span>
        </div>
      </div>
      
      <div className="status-info">
        <div className="status-badge">
          {getStatusIcon(item.status)} {item.status}
        </div>
        {item.attempts > 0 && (
          <div className="attempts">Attempt {item.attempts}/{item.maxAttempts}</div>
        )}
        {item.createdAt && (
          <div className="timestamp">{formatTime(item.createdAt)}</div>
        )}
      </div>

      {item.status === 'processing' && item.progress && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${item.progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. USER PROFILE MANAGEMENT
// ============================================================================

const ProfileManager = () => {
  const [userData, setUserData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const result = await chrome.storage.sync.get(['userData']);
    setUserData(result.userData || {});
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setUserData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await chrome.storage.sync.set({ userData });
      
      // Sync with backend
      await MessageHelper.sendToBackground({
        type: MessageTypes.SYNC_DATA,
        data: { type: 'profile', userData }
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-manager">
      <div className="profile-header">
        <h3>Profile Management</h3>
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="btn-primary"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              className="btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="profile-form">
        <PersonalInfoSection 
          data={userData}
          isEditing={isEditing}
          onChange={handleInputChange}
        />
        
        <ApplicationDataSection
          data={userData.applicationData || {}}
          isEditing={isEditing}
          onChange={(field, value) => handleNestedChange('applicationData', field, value)}
        />
        
        <PreferencesSection
          data={userData.preferences || {}}
          isEditing={isEditing}
          onChange={(field, value) => handleNestedChange('preferences', field, value)}
        />
      </div>
    </div>
  );
};

const PersonalInfoSection = ({ data, isEditing, onChange }) => (
  <div className="form-section">
    <h4>Personal Information</h4>
    <div className="form-grid">
      <FormField
        label="First Name"
        value={data.firstName || ''}
        onChange={(value) => onChange('firstName', value)}
        disabled={!isEditing}
        required
      />
      <FormField
        label="Last Name"
        value={data.lastName || ''}
        onChange={(value) => onChange('lastName', value)}
        disabled={!isEditing}
        required
      />
      <FormField
        label="Email"
        type="email"
        value={data.email || ''}
        onChange={(value) => onChange('email', value)}
        disabled={!isEditing}
        required
      />
      <FormField
        label="Phone"
        value={data.phone || ''}
        onChange={(value) => onChange('phone', value)}
        disabled={!isEditing}
      />
      <FormField
        label="Location"
        value={data.location || ''}
        onChange={(value) => onChange('location', value)}
        disabled={!isEditing}
        fullWidth
      />
      <FormField
        label="Resume URL"
        type="url"
        value={data.resumeUrl || ''}
        onChange={(value) => onChange('resumeUrl', value)}
        disabled={!isEditing}
        fullWidth
      />
    </div>
  </div>
);

const ApplicationDataSection = ({ data, isEditing, onChange }) => {
  const [customAnswers, setCustomAnswers] = useState(data.customAnswers || {});

  useEffect(() => {
    onChange('customAnswers', customAnswers);
  }, [customAnswers]);

  const addCustomAnswer = () => {
    const question = prompt('Enter question:');
    const answer = prompt('Enter answer:');
    if (question && answer) {
      setCustomAnswers(prev => ({
        ...prev,
        [question]: answer
      }));
    }
  };

  const removeCustomAnswer = (question) => {
    setCustomAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[question];
      return newAnswers;
    });
  };

  return (
    <div className="form-section">
      <h4>Application Data</h4>
      <div className="form-grid">
        <FormField
          label="Cover Letter Template"
          type="textarea"
          value={data.coverLetter || ''}
          onChange={(value) => onChange('coverLetter', value)}
          disabled={!isEditing}
          fullWidth
          rows={4}
        />
        
        <div className="custom-answers">
          <div className="section-header">
            <span>Custom Answers</span>
            {isEditing && (
              <button 
                className="btn-small"
                onClick={addCustomAnswer}
              >
                Add Answer
              </button>
            )}
          </div>
          
          {Object.entries(customAnswers).map(([question, answer]) => (
            <div key={question} className="custom-answer-item">
              <div className="question">{question}</div>
              <div className="answer">
                {isEditing ? (
                  <div className="edit-answer">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setCustomAnswers(prev => ({
                        ...prev,
                        [question]: e.target.value
                      }))}
                    />
                    <button
                      className="btn-small btn-danger"
                      onClick={() => removeCustomAnswer(question)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  answer
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PreferencesSection = ({ data, isEditing, onChange }) => (
  <div className="form-section">
    <h4>Preferences</h4>
    <div className="form-grid">
      <FormField
        label="Experience Level"
        type="select"
        value={data.experienceLevel || ''}
        onChange={(value) => onChange('experienceLevel', value)}
        disabled={!isEditing}
        options={[
          { value: 'entry', label: 'Entry Level' },
          { value: 'mid', label: 'Mid Level' },
          { value: 'senior', label: 'Senior Level' },
          { value: 'executive', label: 'Executive Level' }
        ]}
      />
      <FormField
        label="Preferred Salary Range"
        value={data.salaryRange || ''}
        onChange={(value) => onChange('salaryRange', value)}
        disabled={!isEditing}
        placeholder="e.g., $80,000 - $120,000"
      />
    </div>
  </div>
);

// ============================================================================
// 3. SETTINGS PANEL
// ============================================================================

const SettingsPanel = () => {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await chrome.storage.sync.get([
      'autoApply', 'stealthMode', 'apiEndpoint', 'notifications',
      'platforms', 'retryAttempts', 'delayRange'
    ]);
    setSettings(result);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await chrome.storage.sync.set(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderSettingsContent = () => {
    switch (activeSettingsTab) {
      case 'general':
        return (
          <>
            <GeneralSettings settings={settings} onChange={updateSetting} />
            <PlatformSettings settings={settings} onChange={updateSetting} />
          </>
        );
      case 'notifications':
        return <NotificationSettings />;
      case 'advanced':
        return <AdvancedSettings settings={settings} onChange={updateSetting} />;
      default:
        return <GeneralSettings settings={settings} onChange={updateSetting} />;
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Settings</h3>
        {activeSettingsTab !== 'notifications' && (
          <button 
            className="btn-primary"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeSettingsTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('general')}
        >
          General
        </button>
        <button
          className={`settings-tab ${activeSettingsTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`settings-tab ${activeSettingsTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('advanced')}
        >
          Advanced
        </button>
      </div>

      <div className="settings-content">
        {renderSettingsContent()}
      </div>
    </div>
  );
};

const GeneralSettings = ({ settings, onChange }) => (
  <div className="settings-section">
    <h4>General</h4>
    
    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={settings.autoApply || false}
          onChange={(e) => onChange('autoApply', e.target.checked)}
        />
        Enable Auto-Apply
      </label>
      <span className="setting-description">
        Automatically apply to detected jobs
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={settings.stealthMode !== false}
          onChange={(e) => onChange('stealthMode', e.target.checked)}
        />
        Stealth Mode
      </label>
      <span className="setting-description">
        Use human-like delays and interactions
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={settings.notifications !== false}
          onChange={(e) => onChange('notifications', e.target.checked)}
        />
        Show Notifications
      </label>
      <span className="setting-description">
        Display application status notifications
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">API Endpoint</label>
      <input
        type="url"
        value={settings.apiEndpoint || 'http://localhost:5000'}
        onChange={(e) => onChange('apiEndpoint', e.target.value)}
        placeholder="http://localhost:5000"
      />
      <span className="setting-description">
        Backend API server URL
      </span>
    </div>
  </div>
);

const PlatformSettings = ({ settings, onChange }) => {
  const platforms = ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster'];
  const enabledPlatforms = settings.platforms || platforms;

  const togglePlatform = (platform) => {
    const newPlatforms = enabledPlatforms.includes(platform)
      ? enabledPlatforms.filter(p => p !== platform)
      : [...enabledPlatforms, platform];
    onChange('platforms', newPlatforms);
  };

  return (
    <div className="settings-section">
      <h4>Supported Platforms</h4>
      
      <div className="platform-list">
        {platforms.map(platform => (
          <div key={platform} className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={enabledPlatforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
              />
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdvancedSettings = ({ settings, onChange }) => (
  <div className="settings-section">
    <h4>Advanced</h4>
    
    <div className="setting-item">
      <label className="setting-label">Retry Attempts</label>
      <input
        type="number"
        min="1"
        max="5"
        value={settings.retryAttempts || 3}
        onChange={(e) => onChange('retryAttempts', parseInt(e.target.value))}
      />
      <span className="setting-description">
        Number of retry attempts for failed applications
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">Delay Range (seconds)</label>
      <div className="range-inputs">
        <input
          type="number"
          min="1"
          max="30"
          value={settings.delayRange?.min || 5}
          onChange={(e) => onChange('delayRange', {
            ...settings.delayRange,
            min: parseInt(e.target.value)
          })}
          placeholder="Min"
        />
        <span>to</span>
        <input
          type="number"
          min="5"
          max="60"
          value={settings.delayRange?.max || 10}
          onChange={(e) => onChange('delayRange', {
            ...settings.delayRange,
            max: parseInt(e.target.value)
          })}
          placeholder="Max"
        />
      </div>
      <span className="setting-description">
        Delay range between applications for stealth mode
      </span>
    </div>
  </div>
);

// ============================================================================
// 4. APPLICATION HISTORY
// ============================================================================

const ApplicationHistory = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    platform: 'all',
    company: '',
    dateRange: '30'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1
  });

  useEffect(() => {
    loadApplications();
  }, [filters, pagination.page]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await MessageHelper.sendToBackground({
        type: MessageTypes.GET_ANALYTICS,
        data: {
          type: 'applications',
          filters,
          pagination
        }
      });
      
      setApplications(response.applications || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.pagination?.totalPages || 1
      }));
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const changePage = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  return (
    <div className="application-history">
      <div className="history-header">
        <h3>Application History</h3>
        <button 
          className="btn-secondary"
          onClick={loadApplications}
        >
          Refresh
        </button>
      </div>

      <HistoryFilters 
        filters={filters}
        onChange={updateFilter}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <ApplicationList applications={applications} />
          <Pagination 
            current={pagination.page}
            total={pagination.totalPages}
            onChange={changePage}
          />
        </>
      )}
    </div>
  );
};

const HistoryFilters = ({ filters, onChange }) => (
  <div className="history-filters">
    <div className="filter-row">
      <select
        value={filters.status}
        onChange={(e) => onChange('status', e.target.value)}
      >
        <option value="all">All Status</option>
        <option value="applied">Applied</option>
        <option value="pending">Pending</option>
        <option value="interview">Interview</option>
        <option value="rejected">Rejected</option>
        <option value="offered">Offered</option>
      </select>

      <select
        value={filters.platform}
        onChange={(e) => onChange('platform', e.target.value)}
      >
        <option value="all">All Platforms</option>
        <option value="linkedin">LinkedIn</option>
        <option value="indeed">Indeed</option>
        <option value="glassdoor">Glassdoor</option>
        <option value="google">Google Jobs</option>
      </select>

      <input
        type="text"
        placeholder="Company name..."
        value={filters.company}
        onChange={(e) => onChange('company', e.target.value)}
      />

      <select
        value={filters.dateRange}
        onChange={(e) => onChange('dateRange', e.target.value)}
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </select>
    </div>
  </div>
);

const ApplicationList = ({ applications }) => (
  <div className="application-list">
    {applications.length === 0 ? (
      <div className="empty-state">No applications found</div>
    ) : (
      applications.map(app => (
        <ApplicationItem key={app.id} application={app} />
      ))
    )}
  </div>
);

const ApplicationItem = ({ application }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const colors = {
      applied: '#0073b1',
      pending: '#ff9500',
      interview: '#00d4aa',
      rejected: '#cc1016',
      offered: '#057642'
    };
    return colors[status] || '#666';
  };

  return (
    <div className="application-item">
      <div className="app-header">
        <div className="job-title">{application.jobTitle}</div>
        <div 
          className="status-badge"
          style={{ backgroundColor: getStatusColor(application.status) }}
        >
          {application.status}
        </div>
      </div>
      
      <div className="app-details">
        <div className="company">{application.company}</div>
        <div className="platform">{application.platform}</div>
        <div className="date">{formatDate(application.appliedAt)}</div>
      </div>

      {application.automatedApplication && (
        <div className="automation-badge">🤖 Automated</div>
      )}

      {application.processingTime && (
        <div className="processing-time">
          Completed in {Math.round(application.processingTime / 1000)}s
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const Header = () => (
  <header className="popup-header">
    <div className="logo">
      <img src="icons/icon32.png" alt="JobScrapper" />
      <h1>JobScrapper</h1>
    </div>
  </header>
);

const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'history', label: 'History', icon: '📋' }
  ];

  return (
    <nav className="tab-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const FormField = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  disabled, 
  required, 
  fullWidth,
  options,
  rows,
  placeholder 
}) => (
  <div className={`form-field ${fullWidth ? 'full-width' : ''}`}>
    <label className="field-label">
      {label} {required && <span className="required">*</span>}
    </label>
    
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select...</option>
        {options?.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows || 3}
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    )}
  </div>
);

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <span>Loading...</span>
  </div>
);

const Pagination = ({ current, total, onChange }) => (
  <div className="pagination">
    <button
      onClick={() => onChange(current - 1)}
      disabled={current <= 1}
    >
      Previous
    </button>
    
    <span className="page-info">
      Page {current} of {total}
    </span>
    
    <button
      onClick={() => onChange(current + 1)}
      disabled={current >= total}
    >
      Next
    </button>
  </div>
);

// ============================================================================
// UTILITIES
// ============================================================================

const formatUptime = (uptime) => {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export default JobScrapperPopup;
