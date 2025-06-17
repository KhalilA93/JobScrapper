// Storage management utilities
export const storageManager = {
  // Initialize default storage values
  async initializeStorage() {
    const defaultSettings = {
      autoApply: false,
      dailyLimit: 5,
      userProfile: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        resume: ''
      },
      preferences: {
        minSalary: 0,
        locations: [],
        experienceLevel: '',
        jobTypes: []
      }
    };

    const existing = await chrome.storage.local.get('userSettings');
    if (!existing.userSettings) {
      await chrome.storage.local.set({ userSettings: defaultSettings });
    }
  },

  // Get user settings
  async getUserSettings() {
    const result = await chrome.storage.local.get('userSettings');
    return result.userSettings || {};
  },

  // Update user settings
  async updateUserSettings(updates) {
    const current = await this.getUserSettings();
    const updated = { ...current, ...updates };
    await chrome.storage.local.set({ userSettings: updated });
    return updated;
  },

  // Add job to storage
  async addJob(jobData) {
    const jobs = await this.getJobs();
    jobs.push({
      ...jobData,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    });
    await chrome.storage.local.set({ jobs });
  },

  // Get all jobs
  async getJobs() {
    const result = await chrome.storage.local.get('jobs');
    return result.jobs || [];
  },

  // Add application to storage
  async addApplication(applicationData) {
    const applications = await this.getApplications();
    applications.push({
      ...applicationData,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString()
    });
    await chrome.storage.local.set({ applications });
  },

  // Get all applications
  async getApplications() {
    const result = await chrome.storage.local.get('applications');
    return result.applications || [];
  },

  // Get statistics
  async getStats() {
    const [jobs, applications] = await Promise.all([
      this.getJobs(),
      this.getApplications()
    ]);

    return {
      jobsFound: jobs.length,
      applications: applications.length,
      todayApplications: applications.filter(app => {
        const today = new Date().toDateString();
        return new Date(app.submittedAt).toDateString() === today;
      }).length
    };
  },

  // Clear all data (for development/testing)
  async clearAll() {
    await chrome.storage.local.clear();
    await this.initializeStorage();
  }
};
