const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validation schemas
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  profile: Joi.object({
    phone: Joi.string(),
    location: Joi.string(),
    linkedinProfile: Joi.string(),
    githubProfile: Joi.string(),
    portfolioUrl: Joi.string(),
    skills: Joi.array().items(Joi.string()),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'executive'),
    preferredRoles: Joi.array().items(Joi.string()),
    resumeUrl: Joi.string(),
    coverLetterTemplate: Joi.string()
  })
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/users/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = userRegistrationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const { email, password, name, profile } = value;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      profile: profile || {}
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/users/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = userLoginSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const { email, password } = value;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/users/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    // This would normally use authentication middleware
    // For now, we'll return a mock profile
    res.json({
      id: 'user123',
      email: 'user@example.com',
      name: 'John Doe',
      profile: {
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        linkedinProfile: 'https://linkedin.com/in/johndoe',
        githubProfile: 'https://github.com/johndoe',
        portfolioUrl: 'https://johndoe.dev',
        skills: ['JavaScript', 'React', 'Node.js', 'Python'],
        experienceLevel: 'mid',
        preferredRoles: ['Frontend Developer', 'Full Stack Developer'],
        resumeUrl: 'https://drive.google.com/file/d/...',
        coverLetterTemplate: 'Dear Hiring Manager...'
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res) => {
  try {
    // This would normally use authentication middleware
    // For now, we'll return success
    res.json({
      message: 'Profile updated successfully',
      profile: req.body
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
