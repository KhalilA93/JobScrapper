const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Unique identifiers
  jobId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster', 'wellfound', 'dice']
  },
  
  // Basic job information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  company: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    size: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise']
    },
    industry: String,
    website: String,
    logoUrl: String
  },
  
  // Location details
  location: {
    city: String,
    state: String,
    country: { type: String, default: 'US' },
    isRemote: { type: Boolean, default: false },
    remoteType: {
      type: String,
      enum: ['fully-remote', 'hybrid', 'on-site'],
      default: 'on-site'
    },
    formatted: String // "San Francisco, CA" or "Remote"
  },
  
  // Job content
  description: {
    type: String,
    maxlength: 10000
  },
  requirements: [String],
  responsibilities: [String],
  benefits: [String],
  qualifications: [String],
  
  // Job classification
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary', 'freelance'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'],
    default: 'mid'
  },
  department: String,
  
  // Compensation
  salary: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'monthly', 'yearly'],
      default: 'yearly'
    },
    isEstimated: { type: Boolean, default: false }
  },
  
  // Skills and tags
  skills: {
    required: [String],
    preferred: [String],
    all: [String] // Combined for easier searching
  },
  tags: [String],
  
  // URLs and application
  originalUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  applyUrl: String,
  easyApply: { type: Boolean, default: false },
  
  // Dates and timing
  postedDate: Date,
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiryDate: Date,
  
  // Status and tracking
  status: {
    type: String,
    enum: ['active', 'expired', 'filled', 'removed'],
    default: 'active'
  },
  
  // Analytics
  metrics: {
    viewCount: { type: Number, default: 0 },
    applicantCount: Number,
    applicationDeadline: Date,
    matchScore: { type: Number, min: 0, max: 100 },
    priority: { type: Number, default: 0, min: 0, max: 10 }
  },
  
  // Scraping metadata
  scrapingInfo: {
    lastUpdated: { type: Date, default: Date.now },
    updateCount: { type: Number, default: 1 },
    source: String, // specific page or search that found this job
    hash: String, // for detecting content changes
    errors: [{
      message: String,
      occurredAt: { type: Date, default: Date.now }
    }]
  },
  
  // Relations
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicates
jobSchema.index({ platform: 1, jobId: 1 }, { unique: true });

// Performance indexes
jobSchema.index({ 'company.name': 1 });
jobSchema.index({ 'location.city': 1, 'location.state': 1 });
jobSchema.index({ status: 1, scrapedAt: -1 });
jobSchema.index({ platform: 1, status: 1 });
jobSchema.index({ 'metrics.matchScore': -1 });
jobSchema.index({ 'skills.all': 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ postedDate: -1 });

// Text search index for job searching
jobSchema.index({
  title: 'text',
  'company.name': 'text',
  description: 'text',
  'skills.all': 'text'
});

// Virtuals
jobSchema.virtual('daysSincePosted').get(function() {
  if (!this.postedDate) return null;
  const diffTime = Math.abs(new Date() - this.postedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

jobSchema.virtual('daysSinceScraped').get(function() {
  const diffTime = Math.abs(new Date() - this.scrapedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

jobSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary || (!this.salary.min && !this.salary.max)) return null;
  
  const format = (amount) => {
    if (this.salary.currency === 'USD') {
      return `$${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${this.salary.currency}`;
  };
  
  if (this.salary.min && this.salary.max) {
    return `${format(this.salary.min)} - ${format(this.salary.max)}`;
  } else if (this.salary.min) {
    return `${format(this.salary.min)}+`;
  } else if (this.salary.max) {
    return `Up to ${format(this.salary.max)}`;
  }
  return null;
});

// Pre-save middleware
jobSchema.pre('save', function(next) {
  // Combine required and preferred skills into 'all' for easier searching
  if (this.skills) {
    const allSkills = [
      ...(this.skills.required || []),
      ...(this.skills.preferred || [])
    ];
    this.skills.all = [...new Set(allSkills)]; // Remove duplicates
  }
  
  // Update scraping info
  if (this.isModified() && !this.isNew) {
    this.scrapingInfo.lastUpdated = new Date();
    this.scrapingInfo.updateCount += 1;
  }
  
  // Format location string
  if (this.location.city || this.location.state) {
    if (this.location.isRemote) {
      this.location.formatted = `Remote${this.location.city ? ` (${this.location.city}, ${this.location.state})` : ''}`;
    } else {
      this.location.formatted = [this.location.city, this.location.state]
        .filter(Boolean)
        .join(', ');
    }
  }
  
  next();
});

// Static methods
jobSchema.statics.findByPlatform = function(platform, options = {}) {
  const query = { platform, status: 'active' };
  return this.find(query)
    .sort({ scrapedAt: -1 })
    .limit(options.limit || 100);
};

jobSchema.statics.findRecent = function(days = 7, options = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.find({ 
    scrapedAt: { $gte: since },
    status: 'active'
  })
  .sort({ scrapedAt: -1 })
  .limit(options.limit || 100);
};

jobSchema.statics.findByLocation = function(city, state, options = {}) {
  const query = {
    $or: [
      { 'location.city': new RegExp(city, 'i') },
      { 'location.isRemote': true }
    ],
    status: 'active'
  };
  
  if (state) {
    query.$or[0]['location.state'] = new RegExp(state, 'i');
  }
  
  return this.find(query)
    .sort({ 'metrics.matchScore': -1, scrapedAt: -1 })
    .limit(options.limit || 100);
};

jobSchema.statics.searchJobs = function(searchTerm, filters = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'active'
  };
  
  // Apply filters
  if (filters.platform) query.platform = filters.platform;
  if (filters.employmentType) query.employmentType = filters.employmentType;
  if (filters.experienceLevel) query.experienceLevel = filters.experienceLevel;
  if (filters.isRemote !== undefined) query['location.isRemote'] = filters.isRemote;
  if (filters.minSalary) query['salary.min'] = { $gte: filters.minSalary };
  if (filters.skills && filters.skills.length > 0) {
    query['skills.all'] = { $in: filters.skills };
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, 'metrics.matchScore': -1 });
};

jobSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        platforms: { $addToSet: '$platform' },
        avgMatchScore: { $avg: '$metrics.matchScore' }
      }
    }
  ]);
};

// Instance methods
jobSchema.methods.calculateMatchScore = function(userPreferences) {
  let score = 0;
  
  // Title matching (25%)
  if (userPreferences.skills && this.skills.all) {
    const titleSkillMatches = userPreferences.skills.filter(skill =>
      this.title.toLowerCase().includes(skill.toLowerCase())
    );
    score += Math.min(25, (titleSkillMatches.length / userPreferences.skills.length) * 25);
  }
  
  // Location matching (20%)
  if (userPreferences.locations && this.location.formatted) {
    const locationMatch = userPreferences.locations.some(loc =>
      this.location.formatted.toLowerCase().includes(loc.toLowerCase()) ||
      this.location.isRemote
    );
    if (locationMatch) score += 20;
  }
  
  // Skills matching (30%)
  if (userPreferences.skills && this.skills.all && this.skills.all.length > 0) {
    const skillMatches = this.skills.all.filter(skill =>
      userPreferences.skills.some(userSkill =>
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
    score += Math.min(30, (skillMatches.length / this.skills.all.length) * 30);
  }
  
  // Experience level matching (15%)
  if (userPreferences.experienceLevel && this.experienceLevel) {
    if (userPreferences.experienceLevel === this.experienceLevel) {
      score += 15;
    }
  }
  
  // Employment type matching (10%)
  if (userPreferences.jobTypes && userPreferences.jobTypes.includes(this.employmentType)) {
    score += 10;
  }
  
  this.metrics.matchScore = Math.round(score);
  return this.metrics.matchScore;
};

jobSchema.methods.incrementViewCount = function() {
  this.metrics.viewCount += 1;
  return this.save();
};

jobSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

jobSchema.methods.updateFromScrape = function(newData) {
  // Update only specific fields that might change
  const updateFields = ['description', 'requirements', 'benefits', 'salary', 'status'];
  
  updateFields.forEach(field => {
    if (newData[field] !== undefined) {
      this[field] = newData[field];
    }
  });
  
  this.scrapingInfo.lastUpdated = new Date();
  this.scrapingInfo.updateCount += 1;
  
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);
