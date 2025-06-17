const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Joi = require('joi');

// Validation schemas
const jobSchema = Joi.object({
  jobId: Joi.string().required(),
  title: Joi.string().required().trim(),
  company: Joi.string().required().trim(),
  location: Joi.string().trim().allow(''),
  description: Joi.string().allow(''),
  requirements: Joi.array().items(Joi.string()),
  benefits: Joi.array().items(Joi.string()),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'temporary'),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'executive'),
  salary: Joi.object({
    min: Joi.number(),
    max: Joi.number(),
    currency: Joi.string().default('USD'),
    period: Joi.string().valid('hourly', 'daily', 'monthly', 'yearly').default('yearly')
  }),
  platform: Joi.string().required().valid('linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster'),
  originalUrl: Joi.string().required(),
  applyUrl: Joi.string(),
  tags: Joi.array().items(Joi.string()),
  skills: Joi.array().items(Joi.string()),
  postedDate: Joi.date(),
  expiryDate: Joi.date(),
  applicantCount: Joi.number()
});

const scrapeDataSchema = Joi.object({
  jobs: Joi.array().items(jobSchema),
  platform: Joi.string().required(),
  url: Joi.string().required()
});

// GET /api/jobs - Get all jobs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      platform,
      status,
      location,
      company,
      minScore,
      sortBy = 'scrapedAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (platform) filter.platform = platform;
    if (status) filter.applicationStatus = status;
    if (location) filter.location = new RegExp(location, 'i');
    if (company) filter.company = new RegExp(company, 'i');
    if (minScore) filter.matchScore = { $gte: parseInt(minScore) };
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const jobs = await Job.find(filter)
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Job.countDocuments(filter);

    res.json({
      jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalJobs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Increment view count
    job.viewCount += 1;
    await job.save();
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req, res) => {
  try {
    const { error, value } = jobSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Check if job already exists
    const existingJob = await Job.findOne({ 
      jobId: value.jobId, 
      platform: value.platform 
    });
    
    if (existingJob) {
      // Update existing job
      Object.assign(existingJob, value);
      existingJob.updatedAt = new Date();
      await existingJob.save();
      
      return res.json({ 
        message: 'Job updated', 
        job: existingJob,
        isNew: false 
      });
    }

    // Create new job
    const job = new Job(value);
    await job.save();
    
    res.status(201).json({ 
      message: 'Job created', 
      job,
      isNew: true 
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/jobs/scrape - Bulk create jobs from scraping
router.post('/scrape', async (req, res) => {
  try {
    const { error, value } = scrapeDataSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const { jobs, platform, url } = value;
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const jobData of jobs) {
      try {
        const existingJob = await Job.findOne({ 
          jobId: jobData.jobId, 
          platform: jobData.platform 
        });
        
        if (existingJob) {
          // Update existing job
          Object.assign(existingJob, jobData);
          existingJob.updatedAt = new Date();
          await existingJob.save();
          results.updated++;
        } else {
          // Create new job
          const job = new Job(jobData);
          await job.save();
          results.created++;
        }
      } catch (jobError) {
        results.failed++;
        results.errors.push({
          jobId: jobData.jobId,
          error: jobError.message
        });
      }
    }

    res.json({
      message: 'Scraping completed',
      results,
      scrapedFrom: url,
      platform
    });
  } catch (error) {
    console.error('Error processing scraped jobs:', error);
    res.status(500).json({ error: 'Failed to process scraped jobs' });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = jobSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job updated', job });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/jobs/:id - Soft delete job
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted', job });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// POST /api/jobs/:id/match - Calculate match score for job
router.post('/:id/match', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const userPreferences = req.body;
    const matchScore = job.calculateMatchScore(userPreferences);
    
    await job.save();
    
    res.json({ 
      jobId: job._id,
      matchScore,
      details: {
        title: job.title,
        company: job.company,
        location: job.location
      }
    });
  } catch (error) {
    console.error('Error calculating match score:', error);
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

// GET /api/jobs/platform/:platform - Get jobs by platform
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 50 } = req.query;
    
    const jobs = await Job.findByPlatform(platform)
      .limit(parseInt(limit))
      .sort({ scrapedAt: -1 });
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs by platform:', error);
    res.status(500).json({ error: 'Failed to fetch jobs by platform' });
  }
});

// GET /api/jobs/recent/:days - Get recent jobs
router.get('/recent/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const jobs = await Job.findRecent(days);
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    res.status(500).json({ error: 'Failed to fetch recent jobs' });
  }
});

// GET /api/jobs/matches/:minScore - Get high-match jobs
router.get('/matches/:minScore', async (req, res) => {
  try {
    const minScore = parseInt(req.params.minScore) || 70;
    const jobs = await Job.findByMatchScore(minScore);
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching matched jobs:', error);
    res.status(500).json({ error: 'Failed to fetch matched jobs' });
  }
});

// POST /api/jobs/bulk-match - Calculate match scores for multiple jobs
router.post('/bulk-match', async (req, res) => {
  try {
    const { jobIds, userPreferences } = req.body;
    
    if (!jobIds || !Array.isArray(jobIds)) {
      return res.status(400).json({ error: 'jobIds array is required' });
    }
    
    const jobs = await Job.find({ _id: { $in: jobIds } });
    const results = [];
    
    for (const job of jobs) {
      const matchScore = job.calculateMatchScore(userPreferences);
      await job.save();
      
      results.push({
        jobId: job._id,
        title: job.title,
        company: job.company,
        matchScore
      });
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error calculating bulk match scores:', error);
    res.status(500).json({ error: 'Failed to calculate bulk match scores' });
  }
});

module.exports = router;
