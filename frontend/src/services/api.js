import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Dashboard APIs
export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/applications/stats/overview');
    return response;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return mock data for demo
    return {
      totalJobs: 1250,
      totalApplications: 156,
      automatedApplications: 142,
      responseRate: 23,
      applicationsToday: 8
    };
  }
};

export const fetchRecentApplications = async () => {
  try {
    const response = await api.get('/applications/recent/7');
    return response;
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    // Return mock data for demo
    return [
      {
        _id: '1',
        jobTitle: 'Frontend Developer',
        company: 'TechCorp',
        status: 'applied',
        appliedAt: new Date().toISOString(),
        platform: 'linkedin'
      },
      {
        _id: '2',
        jobTitle: 'React Developer',
        company: 'StartupXYZ',
        status: 'interview',
        appliedAt: new Date().toISOString(),
        platform: 'indeed'
      }
    ];
  }
};

// Jobs APIs
export const fetchJobs = async (params = {}) => {
  const response = await api.get('/jobs', { params });
  return response;
};

export const fetchJobById = async (id) => {
  const response = await api.get(`/jobs/${id}`);
  return response;
};

export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response;
};

export const updateJob = async (id, jobData) => {
  const response = await api.put(`/jobs/${id}`, jobData);
  return response;
};

export const deleteJob = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response;
};

export const scrapeJobs = async (scrapeData) => {
  const response = await api.post('/jobs/scrape', scrapeData);
  return response;
};

export const calculateJobMatch = async (jobId, preferences) => {
  const response = await api.post(`/jobs/${jobId}/match`, preferences);
  return response;
};

export const bulkCalculateMatch = async (jobIds, preferences) => {
  const response = await api.post('/jobs/bulk-match', { jobIds, userPreferences: preferences });
  return response;
};

// Applications APIs
export const fetchApplications = async (params = {}) => {
  const response = await api.get('/applications', { params });
  return response;
};

export const fetchApplicationById = async (id) => {
  const response = await api.get(`/applications/${id}`);
  return response;
};

export const createApplication = async (applicationData) => {
  const response = await api.post('/applications', applicationData);
  return response;
};

export const updateApplication = async (id, applicationData) => {
  const response = await api.put(`/applications/${id}`, applicationData);
  return response;
};

export const deleteApplication = async (id) => {
  const response = await api.delete(`/applications/${id}`);
  return response;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await api.put(`/applications/${id}/status`, { status });
  return response;
};

export const addApplicationResponse = async (id, responseData) => {
  const response = await api.post(`/applications/${id}/response`, responseData);
  return response;
};

export const addApplicationInterview = async (id, interviewData) => {
  const response = await api.post(`/applications/${id}/interview`, interviewData);
  return response;
};

export const addApplicationNote = async (id, content, type = 'general') => {
  const response = await api.post(`/applications/${id}/note`, { content, type });
  return response;
};

export const markResponsesAsRead = async (id) => {
  const response = await api.put(`/applications/${id}/responses/read`);
  return response;
};

export const fetchApplicationStats = async () => {
  const response = await api.get('/applications/stats/overview');
  return response;
};

export const bulkCreateApplications = async (applications) => {
  const response = await api.post('/applications/bulk', { applications });
  return response;
};

// Analytics APIs
export const fetchAnalytics = async (params = {}) => {
  try {
    const response = await api.get('/analytics', { params });
    return response;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Return mock data for demo
    return {
      applicationTrend: [
        { date: '2024-01-01', applications: 5, responses: 1 },
        { date: '2024-01-02', applications: 8, responses: 2 },
        { date: '2024-01-03', applications: 12, responses: 3 },
        { date: '2024-01-04', applications: 6, responses: 1 },
        { date: '2024-01-05', applications: 15, responses: 4 },
        { date: '2024-01-06', applications: 10, responses: 2 },
        { date: '2024-01-07', applications: 18, responses: 5 }
      ],
      platformStats: [
        { platform: 'LinkedIn', applications: 45, responses: 12 },
        { platform: 'Indeed', applications: 32, responses: 8 },
        { platform: 'Glassdoor', applications: 28, responses: 6 },
        { platform: 'Google Jobs', applications: 15, responses: 3 }
      ],
      statusBreakdown: [
        { status: 'applied', count: 85 },
        { status: 'pending', count: 25 },
        { status: 'interview', count: 12 },
        { status: 'rejected', count: 34 }
      ]
    };
  }
};

// Settings APIs
export const fetchSettings = async () => {
  try {
    // In a real app, this would fetch from the backend
    const settings = localStorage.getItem('jobScrapperSettings');
    return settings ? JSON.parse(settings) : getDefaultSettings();
  } catch (error) {
    console.error('Error fetching settings:', error);
    return getDefaultSettings();
  }
};

export const updateSettings = async (settings) => {
  try {
    // In a real app, this would save to the backend
    localStorage.setItem('jobScrapperSettings', JSON.stringify(settings));
    return settings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export const getDefaultSettings = () => ({
  automation: {
    autoApply: false,
    maxApplicationsPerDay: 50,
    delayBetweenApplications: 5,
    workingHours: {
      enabled: true,
      start: '09:00',
      end: '17:00'
    }
  },
  filters: {
    targetPositions: ['Software Engineer', 'Developer', 'Frontend', 'Backend'],
    excludeKeywords: ['senior', 'lead', 'manager'],
    locations: ['Remote', 'New York', 'San Francisco'],
    salaryRange: {
      min: 50000,
      max: 150000
    },
    experienceLevel: ['entry', 'mid']
  },
  notifications: {
    emailNotifications: true,
    browserNotifications: true,
    dailyReport: true,
    weeklyReport: true
  }
});

// User Profile APIs
export const fetchUserProfile = async () => {
  try {
    const profile = localStorage.getItem('jobScrapperProfile');
    return profile ? JSON.parse(profile) : getDefaultProfile();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return getDefaultProfile();
  }
};

export const updateUserProfile = async (profile) => {
  try {
    localStorage.setItem('jobScrapperProfile', JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getDefaultProfile = () => ({
  personal: {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedinProfile: '',
    githubProfile: '',
    portfolioUrl: ''
  },
  professional: {
    currentTitle: '',
    experienceLevel: 'mid',
    skills: [],
    industries: [],
    preferredRoles: []
  },
  application: {
    resumeUrl: '',
    coverLetterTemplate: '',
    customAnswers: {}
  }
});

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response;
};

export default api;
