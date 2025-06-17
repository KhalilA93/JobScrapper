const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  // Basic Site Information
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster', 'wellfound', 'dice']
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  baseUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  
  // Site Configuration
  config: {
    // Scraping selectors and rules
    selectors: {
      jobListings: String,
      jobTitle: String,
      companyName: String,
      location: String,
      description: String,
      applyButton: String,
      salaryInfo: String,
      jobType: String,
      postedDate: String
    },
    
    // Rate limiting
    rateLimits: {
      requestsPerMinute: { type: Number, default: 30, min: 1, max: 100 },
      delayBetweenRequests: { type: Number, default: 2000, min: 500 }, // milliseconds
      maxConcurrentRequests: { type: Number, default: 3, min: 1, max: 10 }
    },
    
    // Authentication requirements
    authRequired: { type: Boolean, default: false },
    loginUrl: String,
    
    // Features supported
    features: {
      easyApply: { type: Boolean, default: false },
      bulkScraping: { type: Boolean, default: true },
      advancedFilters: { type: Boolean, default: false },
      salaryData: { type: Boolean, default: false },
      companyInsights: { type: Boolean, default: false }
    }
  },
  
  // Status and Health
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'blocked'],
    default: 'active'
  },
  lastChecked: Date,
  
  // Statistics
  stats: {
    totalJobsScraped: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
    successRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseTime: { type: Number, default: 0 }, // milliseconds
    lastScrapedAt: Date,
    errorsLast24h: { type: Number, default: 0 }
  },
  
  // Error tracking
  lastError: {
    message: String,
    occurredAt: Date,
    errorType: {
      type: String,
      enum: ['rate_limit', 'auth_failed', 'selector_changed', 'network_error', 'blocked']
    }
  },
  
  // Metadata
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  tags: [String],
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
siteSchema.index({ name: 1 });
siteSchema.index({ status: 1 });
siteSchema.index({ priority: -1 });
siteSchema.index({ 'stats.lastScrapedAt': -1 });

// Virtuals
siteSchema.virtual('isHealthy').get(function() {
  return this.status === 'active' && this.stats.errorsLast24h < 5;
});

siteSchema.virtual('daysSinceLastScrape').get(function() {
  if (!this.stats.lastScrapedAt) return null;
  const diffTime = Math.abs(new Date() - this.stats.lastScrapedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static methods
siteSchema.statics.getActiveSites = function() {
  return this.find({ status: 'active' }).sort({ priority: -1 });
};

siteSchema.statics.getHealthySites = function() {
  return this.find({ 
    status: 'active',
    'stats.errorsLast24h': { $lt: 5 }
  }).sort({ priority: -1 });
};

// Instance methods
siteSchema.methods.recordError = function(errorType, message) {
  this.lastError = {
    message,
    errorType,
    occurredAt: new Date()
  };
  this.stats.errorsLast24h += 1;
  
  // Auto-disable if too many errors
  if (this.stats.errorsLast24h >= 10) {
    this.status = 'blocked';
  }
  
  return this.save();
};

siteSchema.methods.recordSuccessfulScrape = function(jobCount = 0) {
  this.stats.lastScrapedAt = new Date();
  this.stats.totalJobsScraped += jobCount;
  this.lastChecked = new Date();
  
  return this.save();
};

siteSchema.methods.updateSuccessRate = function() {
  const totalAttempts = this.stats.totalJobsScraped + this.stats.errorsLast24h;
  if (totalAttempts > 0) {
    this.stats.successRate = Math.round((this.stats.totalJobsScraped / totalAttempts) * 100);
  }
  return this.save();
};

module.exports = mongoose.model('Site', siteSchema);
