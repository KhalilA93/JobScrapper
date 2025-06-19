/**
 * Migration: Initialize Database Indexes
 * Created: 2024-12-28T00:00:00.000Z
 */

const mongoose = require('mongoose');

module.exports = {
  async up() {
    console.log('Running migration: Initialize Database Indexes');
    
    const db = mongoose.connection.db;
    
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });
    await db.collection('users').createIndex({ 'preferences.jobSites': 1 });
    
    // Jobs collection indexes
    await db.collection('jobs').createIndex({ url: 1 }, { unique: true });
    await db.collection('jobs').createIndex({ title: 1, company: 1 });
    await db.collection('jobs').createIndex({ 'location.city': 1, 'location.country': 1 });
    await db.collection('jobs').createIndex({ postedDate: -1 });
    await db.collection('jobs').createIndex({ site: 1 });
    await db.collection('jobs').createIndex({ 'salary.min': 1, 'salary.max': 1 });
    await db.collection('jobs').createIndex({ keywords: 1 });
    await db.collection('jobs').createIndex({ createdAt: -1 });
    await db.collection('jobs').createIndex({ updatedAt: -1 });
    
    // Applications collection indexes
    await db.collection('applications').createIndex({ userId: 1, jobId: 1 }, { unique: true });
    await db.collection('applications').createIndex({ userId: 1, status: 1 });
    await db.collection('applications').createIndex({ appliedAt: -1 });
    await db.collection('applications').createIndex({ status: 1 });
    await db.collection('applications').createIndex({ createdAt: -1 });
    
    // Sites collection indexes
    await db.collection('sites').createIndex({ name: 1 }, { unique: true });
    await db.collection('sites').createIndex({ url: 1 }, { unique: true });
    await db.collection('sites').createIndex({ isActive: 1 });
    
    console.log('✅ Database indexes created successfully');
  },

  async down() {
    console.log('Rolling back migration: Initialize Database Indexes');
    
    const db = mongoose.connection.db;
    
    // Drop all indexes except _id (which cannot be dropped)
    const collections = ['users', 'jobs', 'applications', 'sites'];
    
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        
        for (const index of indexes) {
          if (index.name !== '_id_') {
            await db.collection(collectionName).dropIndex(index.name);
            console.log(`Dropped index ${index.name} from ${collectionName}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to drop indexes from ${collectionName}:`, error.message);
      }
    }
    
    console.log('✅ Database indexes rollback completed');
  }
};
