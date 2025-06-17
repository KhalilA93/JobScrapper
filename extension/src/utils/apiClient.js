// API client for backend communication
export const apiClient = {
  baseURL: 'http://localhost:5000/api',

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // Job-related API calls
  async saveJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: jobData
    });
  },

  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/jobs${query ? `?${query}` : ''}`);
  },

  async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  },

  async updateJob(jobId, updates) {
    return this.request(`/jobs/${jobId}`, {
      method: 'PATCH',
      body: updates
    });
  },

  // Application-related API calls
  async saveApplication(applicationData) {
    return this.request('/applications', {
      method: 'POST',
      body: applicationData
    });
  },

  async getApplications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/applications${query ? `?${query}` : ''}`);
  },

  async updateApplication(applicationId, updates) {
    return this.request(`/applications/${applicationId}`, {
      method: 'PATCH',
      body: updates
    });
  },

  // Analytics API calls
  async getAnalytics(type = 'overview') {
    return this.request(`/analytics/${type}`);
  },

  // User-related API calls
  async getUserProfile() {
    return this.request('/users/profile');
  },

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: profileData
    });
  },

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
};
