const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // References
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  
  // Basic application information
  jobDetails: {
    title: { type: String, required: true },
    company: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster', 'wellfound', 'dice']
    },
    location: String,
    jobId: String, // Original platform job ID
    originalUrl: String
  },
  
  // Application status and timeline
  status: {
    type: String,
    enum: [
      'pending',      // About to apply
      'applied',      // Successfully submitted
      'viewed',       // Employer viewed application
      'screening',    // Initial screening
      'interview',    // Interview scheduled/completed
      'assessment',   // Technical/skill assessment
      'offer',        // Job offer received
      'accepted',     // Offer accepted
      'rejected',     // Application rejected
      'withdrawn',    // Candidate withdrew
      'expired'       // Application expired
    ],
    default: 'pending'
  },
  
  // Application method and automation
  applicationMethod: {
    type: String,
    enum: ['easy_apply', 'external_form', 'email', 'company_website', 'manual'],
    default: 'easy_apply'
  },
  isAutomated: { type: Boolean, default: true },
  
  // Timing information
  submittedAt: Date,
  processingTime: { type: Number, default: 0 }, // milliseconds
  
  // Application data submitted
  submittedData: {
    personalInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String
    },
    documents: {
      resumeUrl: String,
      coverLetterUrl: String,
      portfolioUrl: String,
      additionalDocs: [String]
    },
    responses: [{
      question: { type: String, required: true },
      answer: { type: String, required: true },
      fieldType: {
        type: String,
        enum: ['text', 'textarea', 'select', 'checkbox', 'file', 'date']
      }
    }]
  },
  
  // Communication tracking
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'message', 'interview_request', 'assessment_invite', 'offer', 'rejection'],
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    subject: String,
    content: String,
    sender: String,
    recipient: String,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    isRead: { type: Boolean, default: false },
    attachments: [String],
    metadata: {
      platform: String,
      messageId: String,
      threadId: String
    }
  }],
  
  // Interview tracking
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'in_person', 'technical', 'behavioral', 'panel', 'final'],
      required: true
    },
    stage: {
      type: String,
      enum: ['initial', 'technical', 'cultural', 'final', 'follow_up']
    },
    scheduledAt: Date,
    duration: Number, // minutes
    location: String, // physical address or video link
    interviewers: [{
      name: String,
      role: String,
      email: String
    }],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
      default: 'scheduled'
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      notes: String,
      strengths: [String],
      improvements: [String]
    },
    outcome: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'cancelled']
    },
    followUpRequired: { type: Boolean, default: false }
  }],
  
  // Offer details
  offer: {
    salary: {
      amount: Number,
      currency: { type: String, default: 'USD' },
      period: { type: String, enum: ['hourly', 'monthly', 'yearly'] }
    },
    benefits: [String],
    startDate: Date,
    equity: String,
    bonus: Number,
    vacationDays: Number,
    workArrangement: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site']
    },
    negotiable: { type: Boolean, default: true },
    deadline: Date,
    terms: String
  },
  
  // Notes and tracking
  notes: [{
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['general', 'follow_up', 'interview_prep', 'research', 'feedback', 'reminder'],
      default: 'general'
    },
    isPrivate: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    tags: [String]
  }],
  
  // Metrics and analysis
  metrics: {
    matchScore: { type: Number, min: 0, max: 100 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    confidenceLevel: { type: Number, min: 0, max: 100 }, // How confident about getting this job
    responseTime: Number, // Time between application and first response (hours)
    timeToHire: Number, // Total time from application to offer (days)
    interviewCount: { type: Number, default: 0 },
    rejectionReason: String
  },
  
  // Error tracking
  errors: [{
    step: String, // Which step failed (scraping, form-filling, submission)
    message: { type: String, required: true },
    errorCode: String,
    occurredAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolution: String,
    retryCount: { type: Number, default: 0 }
  }],
  
  // Tags and categorization
  tags: [String],
  category: {
    type: String,
    enum: ['target', 'backup', 'practice', 'reach', 'safety']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better performance
applicationSchema.index({ user: 1, status: 1 });
applicationSchema.index({ job: 1, user: 1 }, { unique: true }); // Prevent duplicate applications
applicationSchema.index({ 'jobDetails.platform': 1, status: 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ 'metrics.priority': 1, status: 1 });
applicationSchema.index({ tags: 1 });
applicationSchema.index({ category: 1 });

// Performance indexes
applicationSchema.index({ 'jobDetails.company': 1 });
applicationSchema.index({ 'metrics.matchScore': -1 });
applicationSchema.index({ createdAt: -1 });

// Virtuals
applicationSchema.virtual('daysSinceApplication').get(function() {
  if (!this.submittedAt) return null;
  const diffTime = Math.abs(new Date() - this.submittedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

applicationSchema.virtual('responseCount').get(function() {
  return this.communications ? this.communications.length : 0;
});

applicationSchema.virtual('unreadCount').get(function() {
  return this.communications ? 
    this.communications.filter(comm => !comm.isRead && comm.direction === 'inbound').length : 0;
});

applicationSchema.virtual('activeInterviews').get(function() {
  return this.interviews ? 
    this.interviews.filter(interview => ['scheduled', 'rescheduled'].includes(interview.status)).length : 0;
});

applicationSchema.virtual('isActive').get(function() {
  return !['rejected', 'withdrawn', 'expired', 'accepted'].includes(this.status);
});

applicationSchema.virtual('timeToResponse').get(function() {
  if (!this.submittedAt || !this.communications.length) return null;
  
  const firstResponse = this.communications
    .filter(comm => comm.direction === 'inbound')
    .sort((a, b) => a.receivedAt - b.receivedAt)[0];
  
  if (!firstResponse) return null;
  
  const diffHours = Math.abs(firstResponse.receivedAt - this.submittedAt) / (1000 * 60 * 60);
  return Math.round(diffHours);
});

// Pre-save middleware
applicationSchema.pre('save', function(next) {
  // Update metrics based on current state
  this.metrics.interviewCount = this.interviews ? this.interviews.length : 0;
  
  // Auto-calculate response time if not set
  if (!this.metrics.responseTime && this.timeToResponse) {
    this.metrics.responseTime = this.timeToResponse;
  }
  
  // Update status based on interviews or offers
  if (this.offer && Object.keys(this.offer).length > 0 && this.status === 'interview') {
    this.status = 'offer';
  }
  
  next();
});

// Static methods
applicationSchema.statics.findByStatus = function(status, userId) {
  const query = { status };
  if (userId) query.user = userId;
  
  return this.find(query)
    .populate('job', 'title company platform')
    .sort({ submittedAt: -1 });
};

applicationSchema.statics.findByPlatform = function(platform, userId) {
  const query = { 'jobDetails.platform': platform };
  if (userId) query.user = userId;
  
  return this.find(query)
    .populate('job', 'title company')
    .sort({ submittedAt: -1 });
};

applicationSchema.statics.findRecent = function(days = 7, userId) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const query = { submittedAt: { $gte: since } };
  if (userId) query.user = userId;
  
  return this.find(query)
    .populate('job', 'title company platform')
    .sort({ submittedAt: -1 });
};

applicationSchema.statics.getStatusStats = function(userId) {
  const pipeline = [
    ...(userId ? [{ $match: { user: mongoose.Types.ObjectId(userId) } }] : []),
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgMatchScore: { $avg: '$metrics.matchScore' },
        avgResponseTime: { $avg: '$metrics.responseTime' }
      }
    },
    { $sort: { count: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

applicationSchema.statics.getPlatformStats = function(userId) {
  const pipeline = [
    ...(userId ? [{ $match: { user: mongoose.Types.ObjectId(userId) } }] : []),
    {
      $group: {
        _id: '$jobDetails.platform',
        total: { $sum: 1 },
        successful: {
          $sum: {
            $cond: [
              { $in: ['$status', ['offer', 'accepted', 'interview']] },
              1,
              0
            ]
          }
        },
        avgMatchScore: { $avg: '$metrics.matchScore' }
      }
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successful', '$total'] },
            100
          ]
        }
      }
    },
    { $sort: { total: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

applicationSchema.statics.getApplicationTrends = function(days = 30, userId) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        submittedAt: { $gte: since },
        ...(userId && { user: mongoose.Types.ObjectId(userId) })
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$submittedAt' },
          month: { $month: '$submittedAt' },
          day: { $dayOfMonth: '$submittedAt' }
        },
        applications: { $sum: 1 },
        interviews: {
          $sum: {
            $cond: [{ $eq: ['$status', 'interview'] }, 1, 0]
          }
        },
        offers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'offer'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ];
  
  return this.aggregate(pipeline);
};

// Instance methods
applicationSchema.methods.addCommunication = function(commData) {
  this.communications.push(commData);
  
  // Auto-update status based on communication type
  if (commData.type === 'interview_request' && this.status === 'applied') {
    this.status = 'interview';
  } else if (commData.type === 'offer' && ['applied', 'interview'].includes(this.status)) {
    this.status = 'offer';
  } else if (commData.type === 'rejection') {
    this.status = 'rejected';
  } else if (this.status === 'applied' && commData.direction === 'inbound') {
    this.status = 'viewed';
  }
  
  return this.save();
};

applicationSchema.methods.scheduleInterview = function(interviewData) {
  this.interviews.push({
    ...interviewData,
    status: 'scheduled'
  });
  
  if (this.status !== 'interview') {
    this.status = 'interview';
  }
  
  return this.save();
};

applicationSchema.methods.addNote = function(content, type = 'general', tags = []) {
  this.notes.push({
    content,
    type,
    tags,
    createdAt: new Date()
  });
  
  return this.save();
};

applicationSchema.methods.updateStatus = function(newStatus, note = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add automatic note for status changes
  const statusNote = `Status changed from ${oldStatus} to ${newStatus}`;
  this.notes.push({
    content: note || statusNote,
    type: 'general',
    createdAt: new Date()
  });
  
  return this.save();
};

applicationSchema.methods.markCommunicationsAsRead = function() {
  this.communications.forEach(comm => {
    if (comm.direction === 'inbound') {
      comm.isRead = true;
    }
  });
  
  return this.save();
};

applicationSchema.methods.recordError = function(step, message, errorCode = null) {
  this.errors.push({
    step,
    message,
    errorCode,
    occurredAt: new Date()
  });
  
  return this.save();
};

applicationSchema.methods.calculateSuccessScore = function() {
  let score = 0;
  
  // Base score by status
  const statusScores = {
    'rejected': 0,
    'withdrawn': 0,
    'expired': 0,
    'pending': 10,
    'applied': 20,
    'viewed': 30,
    'screening': 40,
    'interview': 60,
    'assessment': 70,
    'offer': 90,
    'accepted': 100
  };
  
  score += statusScores[this.status] || 0;
  
  // Bonus for quick responses
  if (this.metrics.responseTime && this.metrics.responseTime < 24) {
    score += 10;
  }
  
  // Match score contribution
  if (this.metrics.matchScore) {
    score += Math.round(this.metrics.matchScore * 0.1);
  }
  
  return Math.min(100, score);
};

module.exports = mongoose.model('Application', applicationSchema);
