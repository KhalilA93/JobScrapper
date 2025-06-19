#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database schema migrations and data transformations
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class DatabaseMigrator {
  constructor() {
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
    this.migrationSchema = new mongoose.Schema({
      version: { type: String, required: true, unique: true },
      description: String,
      executedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
    });
    this.Migration = mongoose.model('Migration', this.migrationSchema);
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

  async loadMigrations() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrations = files
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const version = file.replace('.js', '');
          return {
            version,
            file: path.join(this.migrationsDir, file),
            description: `Migration ${version}`
          };
        })
        .sort((a, b) => a.version.localeCompare(b.version));
      
      return migrations;
    } catch (error) {
      console.log('ℹ️ No migrations directory found, creating...');
      await fs.mkdir(this.migrationsDir, { recursive: true });
      return [];
    }
  }

  async getExecutedMigrations() {
    const executed = await this.Migration.find({ status: 'completed' });
    return executed.map(m => m.version);
  }

  async runMigration(migration) {
    console.log(`🚀 Running migration: ${migration.version}`);
    
    try {
      // Record migration start
      await this.Migration.findOneAndUpdate(
        { version: migration.version },
        { 
          version: migration.version,
          description: migration.description,
          status: 'pending'
        },
        { upsert: true }
      );

      // Load and execute migration
      const migrationModule = require(migration.file);
      await migrationModule.up();

      // Mark as completed
      await this.Migration.findOneAndUpdate(
        { version: migration.version },
        { status: 'completed' }
      );

      console.log(`✅ Migration ${migration.version} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      
      // Mark as failed
      await this.Migration.findOneAndUpdate(
        { version: migration.version },
        { status: 'failed' }
      );

      throw error;
    }
  }

  async rollbackMigration(migration) {
    console.log(`🔄 Rolling back migration: ${migration.version}`);
    
    try {
      const migrationModule = require(migration.file);
      if (migrationModule.down) {
        await migrationModule.down();
      }

      // Remove migration record
      await this.Migration.deleteOne({ version: migration.version });
      console.log(`✅ Migration ${migration.version} rolled back`);
    } catch (error) {
      console.error(`❌ Rollback failed for ${migration.version}:`, error);
      throw error;
    }
  }

  async migrate() {
    console.log('🗃️ Starting database migration...');
    
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    
    const pending = migrations.filter(m => !executed.includes(m.version));
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await this.runMigration(migration);
    }
    
    console.log('🎉 All migrations completed');
  }

  async rollback(version) {
    console.log(`🔄 Rolling back to version: ${version}`);
    
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    
    const toRollback = migrations
      .filter(m => executed.includes(m.version))
      .filter(m => m.version > version)
      .sort((a, b) => b.version.localeCompare(a.version));
    
    for (const migration of toRollback) {
      await this.rollbackMigration(migration);
    }
    
    console.log('🎉 Rollback completed');
  }

  async status() {
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    
    console.log('📊 Migration Status:');
    console.log('==================');
    
    for (const migration of migrations) {
      const status = executed.includes(migration.version) ? '✅ Completed' : '⏳ Pending';
      console.log(`${status} - ${migration.version}: ${migration.description}`);
    }
  }

  async createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const version = `${timestamp}_${name}`;
    const filename = `${version}.js`;
    const filepath = path.join(this.migrationsDir, filename);
    
    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

const mongoose = require('mongoose');

module.exports = {
  async up() {
    console.log('Running migration: ${name}');
    
    // TODO: Implement migration up logic
    // Example:
    // const User = mongoose.model('User');
    // await User.updateMany({}, { $set: { newField: 'defaultValue' } });
  },

  async down() {
    console.log('Rolling back migration: ${name}');
    
    // TODO: Implement migration down logic (rollback)
    // Example:
    // const User = mongoose.model('User');
    // await User.updateMany({}, { $unset: { newField: 1 } });
  }
};
`;

    await fs.mkdir(this.migrationsDir, { recursive: true });
    await fs.writeFile(filepath, template);
    
    console.log(`✅ Created migration: ${filename}`);
    return filepath;
  }
}

// CLI Interface
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.connect();
    
    const command = process.argv[2];
    const arg = process.argv[3];
    
    switch (command) {
      case 'up':
      case 'migrate':
        await migrator.migrate();
        break;
        
      case 'down':
      case 'rollback':
        if (!arg) {
          console.error('❌ Please specify version to rollback to');
          process.exit(1);
        }
        await migrator.rollback(arg);
        break;
        
      case 'status':
        await migrator.status();
        break;
        
      case 'create':
        if (!arg) {
          console.error('❌ Please specify migration name');
          process.exit(1);
        }
        await migrator.createMigration(arg);
        break;
        
      default:
        console.log(`
Usage: node db-migrate.js <command> [args]

Commands:
  migrate, up           Run pending migrations
  rollback, down <ver>  Rollback to specific version
  status               Show migration status
  create <name>        Create new migration file

Examples:
  node db-migrate.js migrate
  node db-migrate.js rollback 20240101000000
  node db-migrate.js status
  node db-migrate.js create add_user_preferences
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;
