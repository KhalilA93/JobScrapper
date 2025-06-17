const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  // Basic job information
  jobId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  requirements: [{
    type: String
  }],
  benefits: [{
    type: String
  }],
  
  // Job details
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'mid'
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  
  // Platform information
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter', 'monster']
  },
  originalUrl: {
    type: String,
    required: true
  },
  applyUrl: String,
  
  // Scraping metadata
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Job matching and filtering
  tags: [{
    type: String,
    trim: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  
  // Application tracking
  applicationStatus: {
    type: String,
    enum: ['not_applied', 'applied', 'rejected', 'interview', 'offer'],
    default: 'not_applied'
  },
  appliedAt: Date,
  
  // Analysis data
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Additional metadata
  postedDate: Date,
  expiryDate: Date,
  applicantCount: Number,
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
JobSchema.index({ platform: 1, jobId: 1 });
JobSchema.index({ company: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ applicationStatus: 1 });
JobSchema.index({ scrapedAt: -1 });
JobSchema.index({ matchScore: -1 });
JobSchema.index({ tags: 1 });
JobSchema.index({ skills: 1 });

// Virtual for days since posted
JobSchema.virtual('daysSincePosted').get(function() {
  if (this.postedDate) {
    const diffTime = Math.abs(new Date() - this.postedDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware
JobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
JobSchema.statics.findByPlatform = function(platform) {
  return this.find({ platform, isActive: true });
};

JobSchema.statics.findRecent = function(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return this.find({ 
    scrapedAt: { $gte: since },
    isActive: true 
  }).sort({ scrapedAt: -1 });
};

JobSchema.statics.findByMatchScore = function(minScore = 70) {
  return this.find({ 
    matchScore: { $gte: minScore },
    isActive: true 
  }).sort({ matchScore: -1 });
};

// Instance methods
JobSchema.methods.markAsApplied = function() {
  this.applicationStatus = 'applied';
  this.appliedAt = new Date();
  return this.save();
};

JobSchema.methods.calculateMatchScore = function(userPreferences) {
  let score = 0;
  
  // Title matching (30%)
  if (userPreferences.targetPositions) {
    const titleMatch = userPreferences.targetPositions.some(pos =>
      this.title.toLowerCase().includes(pos.toLowerCase())
    );
    if (titleMatch) score += 30;
  }
  
  // Location matching (20%)
  if (userPreferences.locations && this.location) {
    const locationMatch = userPreferences.locations.some(loc =>
      this.location.toLowerCase().includes(loc.toLowerCase())
    );
    if (locationMatch) score += 20;
  }
  
  // Skills matching (25%)
  if (userPreferences.skills && this.skills && this.skills.length > 0) {
    const skillMatches = this.skills.filter(skill =>
      userPreferences.skills.some(userSkill =>
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
    score += Math.min(25, (skillMatches.length / this.skills.length) * 25);
  }
  
  // Experience level matching (15%)
  if (userPreferences.experienceLevel && this.experienceLevel) {
    if (userPreferences.experienceLevel === this.experienceLevel) {
      score += 15;
    }
  }
  
  // Exclude keywords penalty (10%)
  if (userPreferences.excludeKeywords) {
    const hasExcludedKeywords = userPreferences.excludeKeywords.some(keyword =>
      this.title.toLowerCase().includes(keyword.toLowerCase()) ||
      (this.description && this.description.toLowerCase().includes(keyword.toLowerCase()))
    );
    if (!hasExcludedKeywords) score += 10;
  }
  
  this.matchScore = Math.round(score);
  return this.matchScore;
};

module.exports = mongoose.model('Job', JobSchema);
