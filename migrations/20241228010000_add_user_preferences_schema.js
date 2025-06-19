/**
 * Migration: Add User Preferences Schema
 * Created: 2024-12-28T01:00:00.000Z
 */

const mongoose = require('mongoose');

module.exports = {
  async up() {
    console.log('Running migration: Add User Preferences Schema');
    
    const db = mongoose.connection.db;
    
    // Update existing users to have default preferences structure
    const defaultPreferences = {
      jobSites: ['linkedin', 'indeed', 'glassdoor'],
      autoApply: false,
      notifications: {
        email: true,
        browser: true,
        frequency: 'daily'
      },
      filters: {
        location: [],
        salaryMin: null,
        salaryMax: null,
        jobType: [],
        experienceLevel: []
      },
      applicationSettings: {
        customCoverLetter: true,
        customResume: false,
        followUp: true,
        followUpDays: 7
      }
    };
    
    // Add preferences to users who don't have them
    const result = await db.collection('users').updateMany(
      { preferences: { $exists: false } },
      { $set: { preferences: defaultPreferences } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users with default preferences`);
    
    // Ensure all users have the new notification preferences structure
    await db.collection('users').updateMany(
      { 'preferences.notifications.frequency': { $exists: false } },
      { $set: { 'preferences.notifications.frequency': 'daily' } }
    );
    
    console.log('✅ Updated user notification preferences structure');
  },

  async down() {
    console.log('Rolling back migration: Add User Preferences Schema');
    
    const db = mongoose.connection.db;
    
    // Remove the preferences field from all users
    const result = await db.collection('users').updateMany(
      {},
      { $unset: { preferences: 1 } }
    );
    
    console.log(`✅ Removed preferences from ${result.modifiedCount} users`);
  }
};
