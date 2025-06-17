const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Joi = require('joi');

// Validation schemas
const applicationSchema = Joi.object({
  jobId: Joi.string().required(),
  jobTitle: Joi.string().required(),
  company: Joi.string().required(),
  location: Joi.string().allow(''),
  platform: Joi.string().required().valid('linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster'),
  status: Joi.string().valid('applied', 'pending', 'reviewed', 'interview', 'rejected', 'offered', 'accepted'),
  applicationMethod: Joi.string().valid('easy_apply', 'form_submission', 'external_link', 'email'),
  applicationData: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    resumeUrl: Joi.string(),
    coverLetter: Joi.string(),
    customAnswers: Joi.array().items(Joi.object({
      question: Joi.string(),
      answer: Joi.string()
    }))
  }),
  automatedApplication: Joi.boolean(),
  processingTime: Joi.number(),
  matchScore: Joi.number().min(0).max(100),
  tags: Joi.array().items(Joi.string()),
  priority: Joi.string().valid('low', 'medium', 'high'),
  expectedSalary: Joi.object({
    min: Joi.number(),
    max: Joi.number(),
    currency: Joi.string().default('USD')
  })
});

// GET /api/applications - Get all applications with filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      platform,
      company,
      automated,
      sortBy = 'appliedAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (company) filter.company = new RegExp(company, 'i');
    if (automated !== undefined) filter.automatedApplication = automated === 'true';
    
    // Search functionality
    if (search) {
      filter.$or = [
        { jobTitle: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const applications = await Application.find(filter)
      .populate('job')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalApplications: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/:id - Get specific application
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/applications - Create new application
router.post('/', async (req, res) => {
  try {
    const { error, value } = applicationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Check if application already exists for this job
    const existingApplication = await Application.findOne({ 
      jobId: value.jobId 
    });
    
    if (existingApplication) {
      return res.status(409).json({ 
        error: 'Application already exists for this job',
        application: existingApplication
      });
    }

    const application = new Application(value);
    await application.save();
    
    res.status(201).json({ 
      message: 'Application created', 
      application 
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PUT /api/applications/:id - Update application
router.put('/:id', async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ message: 'Application updated', application });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ message: 'Application deleted', application });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// PUT /api/applications/:id/status - Update application status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.updateStatus(status);
    
    res.json({ 
      message: 'Application status updated', 
      application,
      oldStatus: application.status,
      newStatus: status
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// POST /api/applications/:id/response - Add response to application
router.post('/:id/response', async (req, res) => {
  try {
    const responseData = req.body;
    
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.addResponse(responseData);
    
    res.json({ 
      message: 'Response added', 
      application 
    });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
});

// POST /api/applications/:id/interview - Add interview to application
router.post('/:id/interview', async (req, res) => {
  try {
    const interviewData = req.body;
    
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.addInterview(interviewData);
    
    res.json({ 
      message: 'Interview added', 
      application 
    });
  } catch (error) {
    console.error('Error adding interview:', error);
    res.status(500).json({ error: 'Failed to add interview' });
  }
});

// POST /api/applications/:id/note - Add note to application
router.post('/:id/note', async (req, res) => {
  try {
    const { content, type = 'general' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.addNote(content, type);
    
    res.json({ 
      message: 'Note added', 
      application 
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// PUT /api/applications/:id/responses/read - Mark responses as read
router.put('/:id/responses/read', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.markResponsesAsRead();
    
    res.json({ 
      message: 'Responses marked as read', 
      application 
    });
  } catch (error) {
    console.error('Error marking responses as read:', error);
    res.status(500).json({ error: 'Failed to mark responses as read' });
  }
});

// GET /api/applications/status/:status - Get applications by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const applications = await Application.findByStatus(status)
      .populate('job')
      .limit(100);
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications by status:', error);
    res.status(500).json({ error: 'Failed to fetch applications by status' });
  }
});

// GET /api/applications/platform/:platform - Get applications by platform
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const applications = await Application.findByPlatform(platform)
      .populate('job')
      .limit(100);
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications by platform:', error);
    res.status(500).json({ error: 'Failed to fetch applications by platform' });
  }
});

// GET /api/applications/recent/:days - Get recent applications
router.get('/recent/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const applications = await Application.findRecent(days)
      .populate('job');
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({ error: 'Failed to fetch recent applications' });
  }
});

// GET /api/applications/stats - Get application statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Application.getStats();
    const applicationsByDate = await Application.getApplicationsByDate(30);
    
    // Calculate additional metrics
    const totalApplications = await Application.countDocuments();
    const automatedApplications = await Application.countDocuments({ automatedApplication: true });
    const responseCount = await Application.aggregate([
      { $project: { responseCount: { $size: '$responses' } } },
      { $group: { _id: null, totalResponses: { $sum: '$responseCount' } } }
    ]);
    
    const responseRate = totalApplications > 0 
      ? Math.round((responseCount[0]?.totalResponses || 0) / totalApplications * 100)
      : 0;

    res.json({
      statusBreakdown: stats,
      applicationsByDate,
      totals: {
        totalApplications,
        automatedApplications,
        manualApplications: totalApplications - automatedApplications,
        responseRate
      }
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ error: 'Failed to fetch application stats' });
  }
});

// POST /api/applications/bulk - Bulk create applications
router.post('/bulk', async (req, res) => {
  try {
    const { applications } = req.body;
    
    if (!applications || !Array.isArray(applications)) {
      return res.status(400).json({ error: 'applications array is required' });
    }

    const results = {
      created: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };

    for (const appData of applications) {
      try {
        // Check for duplicates
        const existing = await Application.findOne({ jobId: appData.jobId });
        
        if (existing) {
          results.duplicates++;
          continue;
        }

        const application = new Application(appData);
        await application.save();
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          jobId: appData.jobId,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk application creation completed',
      results
    });
  } catch (error) {
    console.error('Error bulk creating applications:', error);
    res.status(500).json({ error: 'Failed to bulk create applications' });
  }
});

module.exports = router;
