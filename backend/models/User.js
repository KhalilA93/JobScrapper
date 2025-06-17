const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Profile
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },

  // Job Preferences
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary']
    }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
      default: 'mid'
    },
    salaryRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 }
    },
    locations: [String],
    industries: [String],
    skills: [String],
    remotePreference: {
      type: String,
      enum: ['remote-only', 'hybrid', 'on-site', 'no-preference'],
      default: 'no-preference'
    }
  },

  // Application Settings
  applicationSettings: {
    autoApply: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 5, min: 1, max: 50 },
    coverLetterTemplate: String,
    resumeUrl: String,
    portfolioUrl: String,
    linkedinUrl: String
  },

  // Statistics
  stats: {
    totalApplications: { type: Number, default: 0 },
    applicationsThisMonth: { type: Number, default: 0 },
    lastApplicationDate: Date,
    successRate: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Settings
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'preferences.locations': 1 });
userSchema.index({ 'preferences.industries': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
