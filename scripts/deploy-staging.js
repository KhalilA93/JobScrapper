#!/usr/bin/env node

/**
 * Staging Deployment Script
 * Deploys the JobScrapper application to staging environment
 */

const { DeploymentManager } = require('./deploy-backend');
const path = require('path');

class StagingDeployment extends DeploymentManager {
  constructor() {
    super();
    this.environment = 'staging';
    this.config = {
      environment: 'staging',
      buildCommand: 'npm run build:staging',
      envFile: '.env.staging',
      pm2Config: {
        name: 'jobscrapper-staging',
        instances: 1,
        exec_mode: 'cluster',
        env: {
          NODE_ENV: 'staging',
          PORT: 5001
        }
      },
      backupBeforeDeploy: true,
      runMigrations: true,
      healthCheckRetries: 5,
      notifyOnComplete: true
    };
  }

  async preDeploy() {
    console.log('🚀 Starting staging deployment...');
    
    // Staging-specific pre-deployment tasks
    await this.validateStagingEnvironment();
    await this.backupStagingDatabase();
    await this.notifyDeploymentStart();
  }

  async validateStagingEnvironment() {
    console.log('🔍 Validating staging environment...');
    
    // Check if staging database is accessible
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper_staging';
    
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(mongoUri);
      console.log('✅ Staging database connection verified');
      await mongoose.disconnect();
    } catch (error) {
      throw new Error(`Staging database not accessible: ${error.message}`);
    }
    
    // Check if staging port is available
    if (!await this.checkPortAvailable(5001)) {
      console.log('⚠️  Port 5001 is in use, will restart existing process');
    }
  }

  async backupStagingDatabase() {
    console.log('💾 Creating staging database backup...');
    
    try {
      const DatabaseBackup = require('./db-backup');
      const backup = new DatabaseBackup();
      
      const backupName = backup.generateBackupName('staging-pre-deploy');
      await backup.createFullBackup(backupName);
      
      console.log('✅ Staging backup created successfully');
    } catch (error) {
      console.warn('⚠️  Backup failed, continuing deployment:', error.message);
    }
  }

  async notifyDeploymentStart() {
    const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const fetch = require('node-fetch').default;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'deployment_started',
            environment: 'staging',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version
          })
        });
      } catch (error) {
        console.warn('⚠️  Failed to send deployment notification:', error.message);
      }
    }
  }

  async postDeploy() {
    console.log('🔧 Running post-deployment tasks...');
    
    await this.validateStagingDeployment();
    await this.runStagingTests();
    await this.notifyDeploymentComplete();
  }

  async validateStagingDeployment() {
    console.log('✅ Validating staging deployment...');
    
    // Test API endpoints
    const apiEndpoints = [
      '/health',
      '/api/jobs',
      '/api/applications',
      '/api/analytics'
    ];
    
    for (const endpoint of apiEndpoints) {
      await this.testEndpoint(`http://localhost:5001${endpoint}`);
    }
    
    console.log('✅ All staging endpoints are responding');
  }

  async runStagingTests() {
    console.log('🧪 Running staging tests...');
    
    try {
      const { execSync } = require('child_process');
      execSync('npm run test:integration', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'staging' }
      });
      console.log('✅ Staging tests passed');
    } catch (error) {
      console.warn('⚠️  Some staging tests failed:', error.message);
    }
  }

  async notifyDeploymentComplete() {
    const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const fetch = require('node-fetch').default;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'deployment_completed',
            environment: 'staging',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version,
            url: 'https://staging-api.yourapp.com'
          })
        });
      } catch (error) {
        console.warn('⚠️  Failed to send completion notification:', error.message);
      }
    }
    
    console.log('🎉 Staging deployment completed successfully!');
    console.log('🌐 Staging URL: https://staging-api.yourapp.com');
  }

  async testEndpoint(url) {
    try {
      const fetch = require('node-fetch').default;
      const response = await fetch(url, { timeout: 5000 });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ ${url} - OK`);
    } catch (error) {
      console.error(`❌ ${url} - Failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const deployment = new StagingDeployment();
  
  try {
    console.log('🚀 JobScrapper Staging Deployment');
    console.log('=================================');
    
    await deployment.deploy();
    
    console.log('');
    console.log('🎉 Staging deployment completed successfully!');
    console.log('📱 Test the Chrome extension with staging API');
    console.log('🔍 Monitor logs: pm2 logs jobscrapper-staging');
    
  } catch (error) {
    console.error('❌ Staging deployment failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  // Load staging environment variables
  require('dotenv').config({ path: '.env.staging' });
  main();
}

module.exports = StagingDeployment;
