// Notification Settings Component
// React component for managing notification preferences in the popup

import React, { useState, useEffect } from 'react';
import { useNotificationPreferences, useNotificationStatus, NotificationTester } from '../utils/notificationIntegration.js';

/**
 * Main Notification Settings Component
 */
const NotificationSettings = () => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { permissionGranted, requestPermissions } = useNotificationStatus();
  const [saving, setSaving] = useState(false);

  if (loading) {
    return <div className="notification-settings-loading">Loading notification settings...</div>;
  }

  if (!permissionGranted) {
    return <NotificationPermissionPrompt onRequestPermissions={requestPermissions} />;
  }

  const handlePreferenceChange = async (key, value) => {
    setSaving(true);
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to update notification preference:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNestedPreferenceChange = async (section, key, value) => {
    setSaving(true);
    try {
      await updatePreferences({
        [section]: {
          ...preferences[section],
          [key]: value
        }
      });
    } catch (error) {
      console.error('Failed to update nested notification preference:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-settings">
      <div className="notification-settings-header">
        <h3>Notification Settings</h3>
        {saving && <span className="saving-indicator">Saving...</span>}
      </div>

      <div className="notification-sections">
        <GeneralNotificationSettings 
          preferences={preferences}
          onChange={handlePreferenceChange}
          disabled={saving}
        />
        
        <NotificationTypeSettings
          preferences={preferences}
          onChange={handlePreferenceChange}
          disabled={saving}
        />
        
        <QuietHoursSettings
          preferences={preferences}
          onChange={handleNestedPreferenceChange}
          disabled={saving}
        />
        
        <AdvancedNotificationSettings
          preferences={preferences}
          onChange={handlePreferenceChange}
          disabled={saving}
        />
        
        <NotificationTestSection />
      </div>
    </div>
  );
};

/**
 * Permission Request Prompt
 */
const NotificationPermissionPrompt = ({ onRequestPermissions }) => {
  const [requesting, setRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    setRequesting(true);
    try {
      await onRequestPermissions();
    } catch (error) {
      console.error('Failed to request permissions:', error);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="notification-permission-prompt">
      <div className="permission-icon">🔔</div>
      <h3>Enable Notifications</h3>
      <p>
        JobScrapper can send you notifications about application status, 
        errors, and daily summaries to keep you informed about your job search progress.
      </p>
      <div className="permission-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">✅</span>
          <span>Get notified when applications are submitted successfully</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">❌</span>
          <span>Receive alerts when applications fail so you can take action</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">📊</span>
          <span>Daily summaries of your application activity</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🔄</span>
          <span>Progress updates during bulk application sessions</span>
        </div>
      </div>
      <button 
        className="btn-primary"
        onClick={handleRequestPermissions}
        disabled={requesting}
      >
        {requesting ? 'Requesting...' : 'Enable Notifications'}
      </button>
    </div>
  );
};

/**
 * General Notification Settings
 */
const GeneralNotificationSettings = ({ preferences, onChange, disabled }) => (
  <div className="settings-section">
    <h4>General</h4>
    
    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.enabled || false}
          onChange={(e) => onChange('enabled', e.target.checked)}
          disabled={disabled}
        />
        Enable Notifications
      </label>
      <span className="setting-description">
        Master switch for all notification types
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.soundEnabled || false}
          onChange={(e) => onChange('soundEnabled', e.target.checked)}
          disabled={disabled || !preferences?.enabled}
        />
        Enable Notification Sounds
      </label>
      <span className="setting-description">
        Play sound when notifications are shown
      </span>
    </div>
  </div>
);

/**
 * Notification Type Settings
 */
const NotificationTypeSettings = ({ preferences, onChange, disabled }) => (
  <div className="settings-section">
    <h4>Notification Types</h4>
    
    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.successNotifications || false}
          onChange={(e) => onChange('successNotifications', e.target.checked)}
          disabled={disabled || !preferences?.enabled}
        />
        Success Notifications
      </label>
      <span className="setting-description">
        Notify when applications are submitted successfully
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.errorNotifications || false}
          onChange={(e) => onChange('errorNotifications', e.target.checked)}
          disabled={disabled || !preferences?.enabled}
        />
        Error Notifications
      </label>
      <span className="setting-description">
        Alert when applications fail or encounter errors
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.progressIndicators || false}
          onChange={(e) => onChange('progressIndicators', e.target.checked)}
          disabled={disabled || !preferences?.enabled}
        />
        Progress Notifications
      </label>
      <span className="setting-description">
        Show progress during bulk application sessions
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={preferences?.dailySummary || false}
          onChange={(e) => onChange('dailySummary', e.target.checked)}
          disabled={disabled || !preferences?.enabled}
        />
        Daily Summary
      </label>
      <span className="setting-description">
        Receive daily summary of application activity
      </span>
    </div>
  </div>
);

/**
 * Quiet Hours Settings
 */
const QuietHoursSettings = ({ preferences, onChange, disabled }) => {
  const quietHours = preferences?.quietHours || {};

  return (
    <div className="settings-section">
      <h4>Quiet Hours</h4>
      
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={quietHours.enabled || false}
            onChange={(e) => onChange('quietHours', 'enabled', e.target.checked)}
            disabled={disabled || !preferences?.enabled}
          />
          Enable Quiet Hours
        </label>
        <span className="setting-description">
          Suppress notifications during specified hours
        </span>
      </div>

      {quietHours.enabled && (
        <div className="quiet-hours-config">
          <div className="time-range">
            <div className="time-input">
              <label>Start Time</label>
              <input
                type="time"
                value={quietHours.start || '22:00'}
                onChange={(e) => onChange('quietHours', 'start', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="time-input">
              <label>End Time</label>
              <input
                type="time"
                value={quietHours.end || '08:00'}
                onChange={(e) => onChange('quietHours', 'end', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
          <span className="setting-description">
            Notifications will be suppressed between these hours
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Advanced Notification Settings
 */
const AdvancedNotificationSettings = ({ preferences, onChange, disabled }) => (
  <div className="settings-section">
    <h4>Advanced</h4>
    
    <div className="setting-item">
      <label className="setting-label">Max Notifications Per Hour</label>
      <input
        type="number"
        min="1"
        max="50"
        value={preferences?.maxNotificationsPerHour || 10}
        onChange={(e) => onChange('maxNotificationsPerHour', parseInt(e.target.value))}
        disabled={disabled || !preferences?.enabled}
        className="number-input"
      />
      <span className="setting-description">
        Limit notifications to prevent spam
      </span>
    </div>

    <div className="setting-item">
      <label className="setting-label">Daily Summary Time</label>
      <input
        type="time"
        value={preferences?.summaryTime || '21:00'}
        onChange={(e) => onChange('summaryTime', e.target.value)}
        disabled={disabled || !preferences?.enabled || !preferences?.dailySummary}
        className="time-input"
      />
      <span className="setting-description">
        Time to send daily application summary
      </span>
    </div>
  </div>
);

/**
 * Notification Testing Section
 */
const NotificationTestSection = () => {
  const [testing, setTesting] = useState(false);

  const runTest = async (testType) => {
    setTesting(true);
    try {
      switch (testType) {
        case 'success':
          await NotificationTester.testSuccessNotification();
          break;
        case 'error':
          await NotificationTester.testErrorNotification();
          break;
        case 'progress':
          await NotificationTester.testProgressNotification();
          break;
        case 'summary':
          await NotificationTester.testDailySummary();
          break;
        case 'all':
          await NotificationTester.testAllNotifications();
          break;
      }
    } catch (error) {
      console.error('Test notification failed:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-section">
      <h4>Test Notifications</h4>
      <span className="setting-description">
        Test different notification types to see how they appear
      </span>
      
      <div className="test-buttons">
        <button 
          className="btn-small"
          onClick={() => runTest('success')}
          disabled={testing}
        >
          Test Success
        </button>
        <button 
          className="btn-small"
          onClick={() => runTest('error')}
          disabled={testing}
        >
          Test Error
        </button>
        <button 
          className="btn-small"
          onClick={() => runTest('progress')}
          disabled={testing}
        >
          Test Progress
        </button>
        <button 
          className="btn-small"
          onClick={() => runTest('summary')}
          disabled={testing}
        >
          Test Summary
        </button>
        <button 
          className="btn-small btn-secondary"
          onClick={() => runTest('all')}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test All'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
