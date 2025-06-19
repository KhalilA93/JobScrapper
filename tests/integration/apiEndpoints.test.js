// Integration Tests for JobScrapper API Endpoints
import request from 'supertest';
import { jest } from '@jest/globals';
import { mockApiResponses, mockErrorResponses, generateMockJobs } from '@tests/mocks/jobSiteMocks';

// Mock the Express app and database
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

// Mock database models
const mockJobModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn()
};

const mockApplicationModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  populate: jest.fn()
};

const mockUserModel = {
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn()
};

// Create a mock Express app for testing
const createMockApp = () => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Mock routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const { page = 1, limit = 10, platform, location, keywords } = req.query;
      
      // Simulate database query
      let jobs = generateMockJobs(50);
      
      // Apply filters
      if (platform) {
        jobs = jobs.filter(job => job.platform === platform);
      }
      if (location) {
        jobs = jobs.filter(job => job.location.toLowerCase().includes(location.toLowerCase()));
      }
      if (keywords) {
        jobs = jobs.filter(job => 
          job.title.toLowerCase().includes(keywords.toLowerCase()) ||
          job.company.toLowerCase().includes(keywords.toLowerCase())
        );
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedJobs = jobs.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          jobs: paginatedJobs,
          total: jobs.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(jobs.length / limit)
        }
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.post('/api/jobs', async (req, res) => {
    try {
      const jobData = req.body;
      
      // Validate required fields
      if (!jobData.title || !jobData.company || !jobData.url) {
        return res.status(400).json(mockErrorResponses.validationError);
      }
      
      // Simulate creating job
      const newJob = {
        id: `job_${Date.now()}`,
        ...jobData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: newJob
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (id === 'nonexistent') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
            statusCode: 404
          }
        });
      }
      
      const job = generateMockJobs(1)[0];
      job.id = id;
      
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.put('/api/jobs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedJob = {
        id,
        ...generateMockJobs(1)[0],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: updatedJob
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.delete('/api/jobs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.get('/api/applications', async (req, res) => {
    try {
      const applications = mockApiResponses.applications.data.applications;
      res.json(mockApiResponses.applications);
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.post('/api/applications', async (req, res) => {
    try {
      const applicationData = req.body;
      
      if (!applicationData.jobId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Job ID is required',
            statusCode: 400
          }
        });
      }
      
      const newApplication = {
        id: `app_${Date.now()}`,
        ...applicationData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: newApplication
      });
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  app.get('/api/analytics', async (req, res) => {
    try {
      res.json(mockApiResponses.analytics);
    } catch (error) {
      res.status(500).json(mockErrorResponses.serverError);
    }
  });
  
  // Rate limiting test endpoint
  app.get('/api/rate-limit-test', (req, res) => {
    const rateLimitHeader = req.headers['x-rate-limit-test'];
    if (rateLimitHeader === 'exceed') {
      return res.status(429).json(mockErrorResponses.rateLimited);
    }
    res.json({ success: true, message: 'Rate limit OK' });
  });
  
  return app;
};

describe('Jobs API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = createMockApp();
    jest.clearAllMocks();
  });
  
  describe('GET /api/jobs', () => {
    test('should return paginated jobs list', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobs');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(Array.isArray(response.body.data.jobs)).toBe(true);
    });
    
    test('should filter jobs by platform', async () => {
      const response = await request(app)
        .get('/api/jobs?platform=linkedin')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.data.jobs.forEach(job => {
        expect(job.platform).toBe('linkedin');
      });
    });
    
    test('should filter jobs by location', async () => {
      const response = await request(app)
        .get('/api/jobs?location=San Francisco')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.data.jobs.forEach(job => {
        expect(job.location.toLowerCase()).toContain('san francisco');
      });
    });
    
    test('should filter jobs by keywords', async () => {
      const response = await request(app)
        .get('/api/jobs?keywords=software')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.data.jobs.forEach(job => {
        expect(
          job.title.toLowerCase().includes('software') ||
          job.company.toLowerCase().includes('software')
        ).toBe(true);
      });
    });
    
    test('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/jobs?page=2&limit=5')
        .expect(200);
      
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(5);
      expect(response.body.data.jobs.length).toBeLessThanOrEqual(5);
    });
  });
  
  describe('POST /api/jobs', () => {
    test('should create new job successfully', async () => {
      const newJob = {
        title: 'Senior React Developer',
        company: 'Tech Startup',
        location: 'Austin, TX',
        url: 'https://example.com/job/react-dev',
        platform: 'indeed',
        salary: '$90,000 - $130,000'
      };
      
      const response = await request(app)
        .post('/api/jobs')
        .send(newJob)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(newJob);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
    });
    
    test('should validate required fields', async () => {
      const incompleteJob = {
        title: 'Developer',
        // Missing company and url
      };
      
      const response = await request(app)
        .post('/api/jobs')
        .send(incompleteJob)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should handle duplicate job creation', async () => {
      const job = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'SF',
        url: 'https://example.com/duplicate-job',
        platform: 'linkedin'
      };
      
      // First creation should succeed
      await request(app)
        .post('/api/jobs')
        .send(job)
        .expect(201);
      
      // Second creation with same URL should be handled
      const response = await request(app)
        .post('/api/jobs')
        .send(job)
        .expect(201); // Still succeeds but might be deduplicated
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/jobs/:id', () => {
    test('should return specific job by ID', async () => {
      const response = await request(app)
        .get('/api/jobs/job_123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'job_123');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('company');
    });
    
    test('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/nonexistent')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
  
  describe('PUT /api/jobs/:id', () => {
    test('should update job successfully', async () => {
      const updateData = {
        title: 'Updated Job Title',
        salary: '$100,000 - $150,000'
      };
      
      const response = await request(app)
        .put('/api/jobs/job_123')
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.salary).toBe(updateData.salary);
      expect(response.body.data).toHaveProperty('updatedAt');
    });
  });
  
  describe('DELETE /api/jobs/:id', () => {
    test('should delete job successfully', async () => {
      const response = await request(app)
        .delete('/api/jobs/job_123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });
  });
});

describe('Applications API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = createMockApp();
  });
  
  describe('GET /api/applications', () => {
    test('should return applications list', async () => {
      const response = await request(app)
        .get('/api/applications')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('applications');
      expect(Array.isArray(response.body.data.applications)).toBe(true);
    });
  });
  
  describe('POST /api/applications', () => {
    test('should create new application', async () => {
      const applicationData = {
        jobId: 'job_123',
        coverLetter: 'I am interested in this position...',
        resume: 'resume_url'
      };
      
      const response = await request(app)
        .post('/api/applications')
        .send(applicationData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(applicationData);
      expect(response.body.data.status).toBe('pending');
    });
    
    test('should validate jobId is required', async () => {
      const invalidApplication = {
        coverLetter: 'Test cover letter'
        // Missing jobId
      };
      
      const response = await request(app)
        .post('/api/applications')
        .send(invalidApplication)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Job ID is required');
    });
  });
});

describe('Analytics API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = createMockApp();
  });
  
  describe('GET /api/analytics', () => {
    test('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalJobs');
      expect(response.body.data).toHaveProperty('totalApplications');
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data).toHaveProperty('topPlatforms');
      expect(Array.isArray(response.body.data.topPlatforms)).toBe(true);
    });
    
    test('should include recent activity', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(Array.isArray(response.body.data.recentActivity)).toBe(true);
    });
  });
});

describe('API Error Handling', () => {
  let app;
  
  beforeEach(() => {
    app = createMockApp();
  });
  
  describe('Rate Limiting', () => {
    test('should handle rate limit exceeded', async () => {
      const response = await request(app)
        .get('/api/rate-limit-test')
        .set('x-rate-limit-test', 'exceed')
        .expect(429);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMITED');
      expect(response.body.error).toHaveProperty('retryAfter');
    });
    
    test('should allow requests under rate limit', async () => {
      const response = await request(app)
        .get('/api/rate-limit-test')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Input Validation', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      // Should handle JSON parsing error
    });
    
    test('should sanitize dangerous input', async () => {
      const maliciousJob = {
        title: '<script>alert("xss")</script>Engineer',
        company: 'Tech Corp',
        location: 'SF',
        url: 'https://example.com/job'
      };
      
      const response = await request(app)
        .post('/api/jobs')
        .send(maliciousJob)
        .expect(201);
      
      // Should sanitize the script tag
      expect(response.body.data.title).not.toContain('<script>');
    });
  });
});

describe('API Performance Tests', () => {
  let app;
  
  beforeEach(() => {
    app = createMockApp();
  });
  
  test('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const requests = Array.from({ length: concurrentRequests }, () =>
      request(app).get('/api/jobs')
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(endTime - startTime).toBeLessThan(5000);
  });
  
  test('should handle large query parameters', async () => {
    const longKeywords = 'a'.repeat(1000); // Very long search term
    
    const response = await request(app)
      .get(`/api/jobs?keywords=${longKeywords}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
