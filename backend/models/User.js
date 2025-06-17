const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship']
    }],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive']
    },
    industries: [String],
    autoApply: {
      type: Boolean,
      default: false
    },
    dailyApplicationLimit: {
      type: Number,
      default: 10,
      min: 1,
      max: 50
    }
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    linkedinUrl: String,
    githubUrl: String,
    portfolioUrl: String,
    resumeUrl: String,
    coverLetterTemplate: String,
    bio: String,
    skills: [String],
    experience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String,
      current: Boolean
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: Date,
      endDate: Date,
      gpa: Number
    }]
  },
  statistics: {
    totalApplications: {
      type: Number,
      default: 0
    },
    applicationsToday: {
      type: Number,
      default: 0
    },
    lastApplicationDate: Date,
    successRate: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.name;
});

userSchema.virtual('applicationsThisWeek').get(function() {
  // This would be calculated based on Application model
  return 0; // Placeholder
});

userSchema.virtual('applicationsThisMonth').get(function() {
  // This would be calculated based on Application model
  return 0; // Placeholder
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash the password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update statistics
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statistics.lastApplicationDate = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to increment application count
userSchema.methods.incrementApplicationCount = function() {
  this.statistics.totalApplications += 1;
  this.statistics.applicationsToday += 1;
  this.statistics.lastApplicationDate = new Date();
  return this.save();
};

// Instance method to reset daily application count
userSchema.methods.resetDailyApplicationCount = function() {
  this.statistics.applicationsToday = 0;
  return this.save();
};

// Static method to find users who haven't applied today
userSchema.statics.findUsersForDailyReset = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    $or: [
      { 'statistics.lastApplicationDate': { $lt: today } },
      { 'statistics.lastApplicationDate': { $exists: false } }
    ],
    'statistics.applicationsToday': { $gt: 0 }
  });
};

// Static method to get user analytics
userSchema.statics.getUserAnalytics = async function(userId) {
  const user = await this.findById(userId);
  if (!user) return null;

  // Get application data from Application model
  const Application = mongoose.model('Application');
  
  const [
    totalApplications,
    applicationsThisMonth,
    applicationsThisWeek,
    recentApplications
  ] = await Promise.all([
    Application.countDocuments({ userId }),
    Application.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }),
    Application.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }),
    Application.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('jobId')
  ]);

  return {
    user: user.toObject(),
    applications: {
      total: totalApplications,
      thisMonth: applicationsThisMonth,
      thisWeek: applicationsThisWeek,
      recent: recentApplications
    }
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
