const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  // Job reference
  jobId: {
    type: String,
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
  // Basic application info
  jobTitle: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  location: String,
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster']
  },
  
  // Application details
  status: {
    type: String,
    enum: ['applied', 'pending', 'reviewed', 'interview', 'rejected', 'offered', 'accepted'],
    default: 'applied'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  
  // Application method
  applicationMethod: {
    type: String,
    enum: ['easy_apply', 'form_submission', 'external_link', 'email'],
    default: 'easy_apply'
  },
  
  // Form data used
  applicationData: {
    name: String,
    email: String,
    phone: String,
    resumeUrl: String,
    coverLetter: String,
    customAnswers: [{
      question: String,
      answer: String
    }]
  },
  
  // Tracking information
  automatedApplication: {
    type: Boolean,
    default: true
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  
  // Response tracking
  responses: [{
    type: {
      type: String,
      enum: ['email', 'platform_message', 'phone_call', 'interview_request']
    },
    content: String,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    source: String, // email address, platform, etc.
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  
  // Interview tracking
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'in_person', 'technical', 'behavioral']
    },
    scheduledAt: Date,
    duration: Number, // in minutes
    interviewer: String,
    notes: String,
    outcome: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'cancelled']
    }
  }],
  
  // Notes and follow-ups
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['general', 'follow_up', 'interview_prep', 'feedback'],
      default: 'general'
    }
  }],
  
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Error tracking
  errors: [{
    message: String,
    occurredAt: {
      type: Date,
      default: Date.now
    },
    step: String, // which step failed
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // Success metrics
  matchScore: Number,
  expectedSalary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ApplicationSchema.index({ jobId: 1 });
ApplicationSchema.index({ platform: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ appliedAt: -1 });
ApplicationSchema.index({ company: 1 });
ApplicationSchema.index({ automatedApplication: 1 });

// Virtual for days since application
ApplicationSchema.virtual('daysSinceApplication').get(function() {
  const diffTime = Math.abs(new Date() - this.appliedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for response count
ApplicationSchema.virtual('responseCount').get(function() {
  return this.responses ? this.responses.length : 0;
});

// Virtual for unread responses
ApplicationSchema.virtual('unreadResponses').get(function() {
  return this.responses ? this.responses.filter(r => !r.isRead).length : 0;
});

// Pre-save middleware
ApplicationSchema.pre('save', function(next) {
  // Auto-populate job reference if jobId is provided
  if (this.jobId && !this.job) {
    const Job = mongoose.model('Job');
    Job.findOne({ jobId: this.jobId })
      .then(job => {
        if (job) {
          this.job = job._id;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Static methods
ApplicationSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ appliedAt: -1 });
};

ApplicationSchema.statics.findRecent = function(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return this.find({ 
    appliedAt: { $gte: since }
  }).sort({ appliedAt: -1 });
};

ApplicationSchema.statics.findByPlatform = function(platform) {
  return this.find({ platform }).sort({ appliedAt: -1 });
};

ApplicationSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

ApplicationSchema.statics.getApplicationsByDate = function(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        appliedAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$appliedAt' },
          month: { $month: '$appliedAt' },
          day: { $dayOfMonth: '$appliedAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

// Instance methods
ApplicationSchema.methods.addResponse = function(responseData) {
  this.responses.push(responseData);
  
  // Update status based on response type
  if (responseData.type === 'interview_request') {
    this.status = 'interview';
  } else if (this.status === 'applied') {
    this.status = 'reviewed';
  }
  
  return this.save();
};

ApplicationSchema.methods.addInterview = function(interviewData) {
  this.interviews.push(interviewData);
  this.status = 'interview';
  return this.save();
};

ApplicationSchema.methods.addNote = function(noteContent, noteType = 'general') {
  this.notes.push({
    content: noteContent,
    type: noteType
  });
  return this.save();
};

ApplicationSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  // Add automatic note for status changes
  this.notes.push({
    content: `Status changed to: ${newStatus}`,
    type: 'general'
  });
  
  return this.save();
};

ApplicationSchema.methods.markResponsesAsRead = function() {
  this.responses.forEach(response => {
    response.isRead = true;
  });
  return this.save();
};

module.exports = mongoose.model('Application', ApplicationSchema);
