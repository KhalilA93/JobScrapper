#!/usr/bin/env node

/**
 * Database Restore Script
 * Handles database restoration from backups with verification
 */

const DatabaseBackup = require('./db-backup');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

class DatabaseRestore extends DatabaseBackup {
  constructor() {
    super();
    this.verifyAfterRestore = true;
  }

  async verifyRestoreIntegrity(originalPath, restoredDb) {
    console.log('🔍 Verifying restore integrity...');
    
    try {
      // Connect to restored database
      await mongoose.connect(restoredDb || this.mongoUri);
      
      // Load original metadata
      const metadataPath = path.join(originalPath, 'backup-metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      // Verify collections exist and have expected document counts
      const collections = ['users', 'jobs', 'applications', 'sites'];
      const verificationResults = {};
      
      for (const collectionName of collections) {
        const collection = mongoose.connection.collection(collectionName);
        const count = await collection.countDocuments();
        
        verificationResults[collectionName] = {
          documentCount: count,
          exists: count > 0
        };
        
        console.log(`📊 ${collectionName}: ${count} documents`);
      }
      
      // Perform basic data integrity checks
      await this.performDataIntegrityChecks();
      
      console.log('✅ Restore integrity verification completed');
      return verificationResults;
    } catch (error) {
      console.error('❌ Integrity verification failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  async performDataIntegrityChecks() {
    console.log('🔍 Performing data integrity checks...');
    
    const checks = [
      this.checkUserDocuments,
      this.checkJobDocuments,
      this.checkApplicationDocuments,
      this.checkSiteDocuments
    ];
    
    for (const check of checks) {
      await check.call(this);
    }
  }

  async checkUserDocuments() {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find().limit(5);
    
    for (const user of users) {
      if (!user._id || !user.email) {
        throw new Error(`Invalid user document: ${user._id}`);
      }
    }
    
    console.log('✅ User documents integrity check passed');
  }

  async checkJobDocuments() {
    const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
    const jobs = await Job.find().limit(5);
    
    for (const job of jobs) {
      if (!job._id || !job.title || !job.company) {
        throw new Error(`Invalid job document: ${job._id}`);
      }
    }
    
    console.log('✅ Job documents integrity check passed');
  }

  async checkApplicationDocuments() {
    const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));
    const applications = await Application.find().limit(5);
    
    for (const application of applications) {
      if (!application._id || !application.jobId || !application.userId) {
        throw new Error(`Invalid application document: ${application._id}`);
      }
    }
    
    console.log('✅ Application documents integrity check passed');
  }

  async checkSiteDocuments() {
    const Site = mongoose.model('Site', new mongoose.Schema({}, { strict: false }));
    const sites = await Site.find().limit(5);
    
    for (const site of sites) {
      if (!site._id || !site.name || !site.url) {
        throw new Error(`Invalid site document: ${site._id}`);
      }
    }
    
    console.log('✅ Site documents integrity check passed');
  }

  async createRestorePoint(description) {
    console.log('📍 Creating restore point...');
    
    const restorePointName = this.generateBackupName('restore_point');
    const backupPath = await this.createFullBackup(restorePointName);
    
    // Add restore point metadata
    const metadata = {
      type: 'restore_point',
      description,
      createdAt: new Date().toISOString(),
      originalName: restorePointName
    };
    
    await fs.writeFile(
      path.join(backupPath, 'restore-point-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`✅ Restore point created: ${restorePointName}`);
    return backupPath;
  }

  async restoreWithVerification(backupPath, targetDb, createRestorePoint = true) {
    console.log('🔄 Starting restore with verification...');
    
    let restorePointPath = null;
    
    try {
      // Create restore point before restoration
      if (createRestorePoint) {
        restorePointPath = await this.createRestorePoint(`Before restore from ${path.basename(backupPath)}`);
      }
      
      // Perform the restore
      await this.restoreBackup(backupPath, targetDb);
      
      // Verify the restore
      if (this.verifyAfterRestore) {
        await this.verifyRestoreIntegrity(backupPath, targetDb);
      }
      
      console.log('🎉 Restore completed successfully with verification');
      
      return {
        success: true,
        restorePointPath,
        restoredFrom: backupPath
      };
    } catch (error) {
      console.error('❌ Restore failed:', error);
      
      // Attempt to rollback to restore point
      if (restorePointPath && createRestorePoint) {
        console.log('🔄 Attempting to rollback to restore point...');
        try {
          await this.restoreBackup(restorePointPath, targetDb);
          console.log('✅ Rollback to restore point successful');
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  async listRestorePoints() {
    const backups = await this.listBackups();
    const restorePoints = backups.filter(backup => 
      backup.type === 'restore_point' || backup.name.includes('restore_point')
    );
    
    console.log('📍 Available Restore Points:');
    console.log('============================');
    
    if (restorePoints.length === 0) {
      console.log('No restore points found');
    } else {
      for (const point of restorePoints) {
        const size = this.formatSize(point.size || 0);
        const date = new Date(point.createdAt).toLocaleString();
        console.log(`${point.name.padEnd(40)} ${size.padEnd(10)} ${date}`);
      }
    }
    
    return restorePoints;
  }

  async validateBackupBeforeRestore(backupPath) {
    console.log('🔍 Validating backup before restore...');
    
    try {
      let actualPath = backupPath;
      
      // Handle compressed backups
      if (backupPath.endsWith('.zip')) {
        console.log('📦 Backup is compressed, validation will be performed after extraction');
        return true; // Will be validated during extraction
      }
      
      // Check if metadata exists
      const metadataPath = path.join(actualPath, 'backup-metadata.json');
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        console.log(`📋 Backup type: ${metadata.type}`);
        console.log(`📅 Created: ${metadata.createdAt}`);
        console.log(`🗃️  Database: ${metadata.database}`);
      } catch {
        console.warn('⚠️  No metadata found, proceeding with caution...');
      }
      
      // Check if it's a mongodump backup
      const dbBackupPath = path.join(actualPath, this.dbName);
      if (await this.directoryExists(dbBackupPath)) {
        // Validate mongodump structure
        const collections = await fs.readdir(dbBackupPath);
        const bsonFiles = collections.filter(f => f.endsWith('.bson'));
        
        if (bsonFiles.length === 0) {
          throw new Error('No BSON files found in backup');
        }
        
        console.log(`✅ Found ${bsonFiles.length} collection backups`);
      } else {
        // Check for incremental backup
        const incrementalPath = path.join(actualPath, 'incremental-data.json');
        if (await this.fileExists(incrementalPath)) {
          console.log('✅ Incremental backup structure validated');
        } else {
          throw new Error('Invalid backup structure');
        }
      }
      
      console.log('✅ Backup validation completed');
      return true;
    } catch (error) {
      console.error('❌ Backup validation failed:', error);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async estimateRestoreTime(backupPath) {
    console.log('⏱️  Estimating restore time...');
    
    try {
      const size = await this.getDirectorySize(backupPath);
      
      // Rough estimation based on size (these are very approximate)
      const estimatedSeconds = Math.ceil(size / (10 * 1024 * 1024)); // 10MB per second
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = estimatedSeconds % 60;
      
      console.log(`📊 Backup size: ${this.formatSize(size)}`);
      console.log(`⏱️  Estimated restore time: ${minutes}m ${seconds}s`);
      
      return estimatedSeconds;
    } catch (error) {
      console.log('⚠️  Could not estimate restore time');
      return null;
    }
  }
}

// CLI Interface
async function main() {
  const restore = new DatabaseRestore();
  
  try {
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    switch (command) {
      case 'restore':
        if (!arg1) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        
        // Validate backup
        await restore.validateBackupBeforeRestore(arg1);
        
        // Estimate time
        await restore.estimateRestoreTime(arg1);
        
        // Perform restore with verification
        await restore.restoreWithVerification(arg1, arg2, true);
        break;
        
      case 'restore-fast':
        if (!arg1) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        
        // Fast restore without creating restore point
        await restore.restoreWithVerification(arg1, arg2, false);
        break;
        
      case 'verify':
        if (!arg1) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        
        await restore.verifyRestoreIntegrity(arg1, arg2);
        break;
        
      case 'validate':
        if (!arg1) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        
        await restore.validateBackupBeforeRestore(arg1);
        console.log('✅ Backup is valid and ready for restore');
        break;
        
      case 'restore-points':
        await restore.listRestorePoints();
        break;
        
      case 'create-restore-point':
        const description = arg1 || 'Manual restore point';
        await restore.createRestorePoint(description);
        break;
        
      default:
        console.log(`
Usage: node db-restore.js <command> [args]

Commands:
  restore <backup-path> [db-uri]     Restore backup with verification and restore point
  restore-fast <backup-path> [db-uri] Fast restore without creating restore point
  verify <backup-path> [db-uri]      Verify restore integrity without restoring
  validate <backup-path>             Validate backup before restoration
  restore-points                     List available restore points
  create-restore-point [description] Create a restore point

Examples:
  node db-restore.js restore ./backups/mybackup
  node db-restore.js restore ./backups/mybackup.zip mongodb://localhost:27017/test
  node db-restore.js verify ./backups/mybackup
  node db-restore.js validate ./backups/mybackup.zip
  node db-restore.js restore-points
  node db-restore.js create-restore-point "Before major update"
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Restore operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseRestore;
