#!/usr/bin/env node

/**
 * Database Backup Script
 * Handles MongoDB database backups and restores
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const extract = require('extract-zip');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper';
    this.dbName = this.extractDbName(this.mongoUri);
  }

  extractDbName(uri) {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'jobscrapper';
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  generateBackupName(type = 'full') {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0];
    return `${this.dbName}_${type}_${timestamp}`;
  }

  async checkMongoDumpAvailable() {
    try {
      execSync('mongodump --version', { stdio: 'ignore' });
      return true;
    } catch {
      console.error('❌ mongodump not found. Please install MongoDB tools');
      console.error('   Download from: https://www.mongodb.com/try/download/database-tools');
      return false;
    }
  }

  async createFullBackup(name) {
    console.log('📦 Creating full database backup...');
    
    if (!await this.checkMongoDumpAvailable()) {
      throw new Error('MongoDB tools not available');
    }

    const backupPath = path.join(this.backupDir, name);
    
    try {
      // Create backup using mongodump
      const command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;
      console.log(`🔄 Running: ${command}`);
      
      execSync(command, { stdio: 'inherit' });
      
      // Create metadata file
      const metadata = {
        name,
        type: 'full',
        database: this.dbName,
        createdAt: new Date().toISOString(),
        mongoUri: this.mongoUri.replace(/\/\/[^@]+@/, '//***:***@'), // Hide credentials
        size: await this.getDirectorySize(backupPath)
      };
      
      await fs.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`✅ Full backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async createIncrementalBackup(name, sinceDate) {
    console.log(`📦 Creating incremental backup since ${sinceDate}...`);
    
    const mongoose = require('mongoose');
    await mongoose.connect(this.mongoUri);
    
    try {
      const backupPath = path.join(this.backupDir, name);
      await fs.mkdir(backupPath, { recursive: true });
      
      // Define collections to backup
      const collections = ['users', 'jobs', 'applications', 'sites'];
      const backupData = {};
      
      for (const collectionName of collections) {
        console.log(`📋 Backing up ${collectionName}...`);
        
        const collection = mongoose.connection.collection(collectionName);
        const query = { updatedAt: { $gte: new Date(sinceDate) } };
        const documents = await collection.find(query).toArray();
        
        backupData[collectionName] = documents;
        console.log(`   Found ${documents.length} updated documents`);
      }
      
      // Save backup data
      await fs.writeFile(
        path.join(backupPath, 'incremental-data.json'),
        JSON.stringify(backupData, null, 2)
      );
      
      // Create metadata
      const metadata = {
        name,
        type: 'incremental',
        database: this.dbName,
        sinceDate,
        createdAt: new Date().toISOString(),
        collections: Object.keys(backupData),
        totalDocuments: Object.values(backupData).reduce((sum, docs) => sum + docs.length, 0)
      };
      
      await fs.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`✅ Incremental backup created: ${backupPath}`);
      return backupPath;
    } finally {
      await mongoose.disconnect();
    }
  }

  async compressBackup(backupPath) {
    console.log('🗜️  Compressing backup...');
    
    const archivePath = `${backupPath}.zip`;
    const output = require('fs').createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`✅ Backup compressed: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(backupPath, false);
      archive.finalize();
    });
  }

  async listBackups() {
    await this.ensureBackupDir();
    
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          try {
            const metadataPath = path.join(filePath, 'backup-metadata.json');
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            backups.push({
              ...metadata,
              path: filePath,
              size: await this.getDirectorySize(filePath)
            });
          } catch {
            // Skip directories without metadata
          }
        } else if (file.endsWith('.zip')) {
          const stat = await fs.stat(filePath);
          backups.push({
            name: file.replace('.zip', ''),
            type: 'compressed',
            path: filePath,
            size: stat.size,
            createdAt: stat.mtime.toISOString()
          });
        }
      }
      
      return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  async restoreBackup(backupPath, targetDb) {
    console.log(`🔄 Restoring backup from: ${backupPath}`);
    
    if (!await this.checkMongoDumpAvailable()) {
      throw new Error('MongoDB tools not available');
    }

    try {
      let actualBackupPath = backupPath;
      
      // Extract if compressed
      if (backupPath.endsWith('.zip')) {
        console.log('📦 Extracting compressed backup...');
        const extractPath = backupPath.replace('.zip', '_extracted');
        await extract(backupPath, { dir: extractPath });
        actualBackupPath = extractPath;
      }
      
      // Check if it's a full backup (mongodump format)
      const dbBackupPath = path.join(actualBackupPath, this.dbName);
      
      if (await this.directoryExists(dbBackupPath)) {
        // Restore full backup
        const targetUri = targetDb || this.mongoUri;
        const command = `mongorestore --uri="${targetUri}" --drop "${dbBackupPath}"`;
        
        console.log(`🔄 Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
      } else {
        // Restore incremental backup
        await this.restoreIncrementalBackup(actualBackupPath, targetDb);
      }
      
      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async restoreIncrementalBackup(backupPath, targetDb) {
    console.log('🔄 Restoring incremental backup...');
    
    const mongoose = require('mongoose');
    const targetUri = targetDb || this.mongoUri;
    await mongoose.connect(targetUri);
    
    try {
      const dataPath = path.join(backupPath, 'incremental-data.json');
      const backupData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      
      for (const [collectionName, documents] of Object.entries(backupData)) {
        if (documents.length > 0) {
          console.log(`📋 Restoring ${documents.length} documents to ${collectionName}...`);
          
          const collection = mongoose.connection.collection(collectionName);
          
          // Upsert documents (update if exists, insert if not)
          for (const doc of documents) {
            await collection.replaceOne(
              { _id: doc._id },
              doc,
              { upsert: true }
            );
          }
        }
      }
    } finally {
      await mongoose.disconnect();
    }
  }

  async cleanupOldBackups(keepDays = 30) {
    console.log(`🧹 Cleaning up backups older than ${keepDays} days...`);
    
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    
    let cleaned = 0;
    
    for (const backup of backups) {
      const backupDate = new Date(backup.createdAt);
      
      if (backupDate < cutoffDate) {
        console.log(`🗑️  Removing old backup: ${backup.name}`);
        
        if (backup.type === 'compressed') {
          await fs.unlink(backup.path);
        } else {
          await this.removeDirectory(backup.path);
        }
        
        cleaned++;
      }
    }
    
    console.log(`✅ Cleaned up ${cleaned} old backups`);
  }

  async getDirectorySize(dirPath) {
    let size = 0;
    
    async function calculateSize(currentPath) {
      const files = await fs.readdir(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await calculateSize(filePath);
        } else {
          size += stat.size;
        }
      }
    }
    
    try {
      await calculateSize(dirPath);
      return size;
    } catch {
      return 0;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async removeDirectory(dirPath) {
    await fs.rm(dirPath, { recursive: true, force: true });
  }

  formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// CLI Interface
async function main() {
  const backup = new DatabaseBackup();
  
  try {
    await backup.ensureBackupDir();
    
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    switch (command) {
      case 'create':
      case 'backup':
        const backupName = backup.generateBackupName();
        const backupPath = await backup.createFullBackup(backupName);
        
        if (arg1 === '--compress') {
          await backup.compressBackup(backupPath);
          await backup.removeDirectory(backupPath);
        }
        break;
        
      case 'incremental':
        if (!arg1) {
          console.error('❌ Please specify since date (YYYY-MM-DD)');
          process.exit(1);
        }
        const incName = backup.generateBackupName('incremental');
        await backup.createIncrementalBackup(incName, arg1);
        break;
        
      case 'restore':
        if (!arg1) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        await backup.restoreBackup(arg1, arg2);
        break;
        
      case 'list':
        const backups = await backup.listBackups();
        
        console.log('📋 Available Backups:');
        console.log('=====================');
        
        if (backups.length === 0) {
          console.log('No backups found');
        } else {
          for (const b of backups) {
            const size = backup.formatSize(b.size || 0);
            const date = new Date(b.createdAt).toLocaleString();
            console.log(`${b.type.toUpperCase().padEnd(12)} ${b.name.padEnd(30)} ${size.padEnd(10)} ${date}`);
          }
        }
        break;
        
      case 'cleanup':
        const keepDays = arg1 ? parseInt(arg1) : 30;
        await backup.cleanupOldBackups(keepDays);
        break;
        
      default:
        console.log(`
Usage: node db-backup.js <command> [args]

Commands:
  create, backup [--compress]    Create full database backup
  incremental <since-date>       Create incremental backup since date
  restore <backup-path> [db-uri] Restore backup to database
  list                          List available backups
  cleanup [days]                Remove backups older than N days (default: 30)

Examples:
  node db-backup.js create
  node db-backup.js create --compress
  node db-backup.js incremental 2024-01-01
  node db-backup.js restore ./backups/mybackup
  node db-backup.js list
  node db-backup.js cleanup 7
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Backup operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseBackup;
