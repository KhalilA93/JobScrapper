#!/usr/bin/env node

/**
 * Production Deployment Script
 * Deploys the JobScrapper application to production environment
 */

const { DeploymentManager } = require('./deploy-backend');
const path = require('path');
const readline = require('readline');

class ProductionDeployment extends DeploymentManager {
  constructor() {
    super();
    this.environment = 'production';
    this.config = {
      environment: 'production',
      buildCommand: 'npm run build:prod',
      envFile: '.env.production',
      pm2Config: {
        name: 'jobscrapper-backend',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
          NODE_ENV: 'production',
          PORT: 5000
        }
      },
      backupBeforeDeploy: true,
      runMigrations: true,
      healthCheckRetries: 10,
      notifyOnComplete: true
    };
  }

  async confirmProductionDeployment() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️');
      console.log('=====================================');
      console.log('You are about to deploy to PRODUCTION environment.');
      console.log('This will affect live users and data.');
      console.log('');
      console.log('Please ensure:');
      console.log('✅ All tests have passed');
      console.log('✅ Staging deployment was successful');
      console.log('✅ You have notified the team');
      console.log('✅ You have a rollback plan');
      console.log('');

      rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  async preDeploy() {
    console.log('🚀 Starting production deployment...');
    
    // Confirm production deployment
    if (!await this.confirmProductionDeployment()) {
      throw new Error('Production deployment cancelled by user');
    }
    
    await this.validateProductionEnvironment();
    await this.createProductionBackup();
    await this.createRollbackPlan();
    await this.notifyProductionDeploymentStart();
  }

  async validateProductionEnvironment() {
    console.log('🔍 Validating production environment...');
    
    // Check critical environment variables
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'SESSION_SECRET',
      'CORS_ORIGINS'
    ];
    
    for (const varName of requiredVars) {
      if (!process.env[varName] || process.env[varName].includes('REPLACE')) {
        throw new Error(`Production environment variable ${varName} is not properly configured`);
      }
    }
    
    // Check production database connection
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Production database connection verified');
      await mongoose.disconnect();
    } catch (error) {
      throw new Error(`Production database not accessible: ${error.message}`);
    }
    
    // Validate SSL certificates if configured
    if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
      await this.validateSSLCertificates();
    }
    
    console.log('✅ Production environment validation passed');
  }

  async validateSSLCertificates() {
    const fs = require('fs').promises;
    
    try {
      await fs.access(process.env.SSL_CERT_PATH);
      await fs.access(process.env.SSL_KEY_PATH);
      console.log('✅ SSL certificates found and accessible');
    } catch (error) {
      throw new Error('SSL certificates not found or not accessible');
    }
  }

  async createProductionBackup() {
    console.log('💾 Creating production database backup...');
    
    try {
      const DatabaseBackup = require('./db-backup');
      const backup = new DatabaseBackup();
      
      const backupName = backup.generateBackupName('prod-pre-deploy');
      const backupPath = await backup.createFullBackup(backupName);
      
      // Compress the backup for storage efficiency
      await backup.compressBackup(backupPath);
      await backup.removeDirectory(backupPath);
      
      this.rollbackBackupPath = `${backupPath}.zip`;
      console.log('✅ Production backup created successfully');
    } catch (error) {
      throw new Error(`Production backup failed: ${error.message}`);
    }
  }

  async createRollbackPlan() {
    console.log('📋 Creating rollback plan...');
    
    const rollbackPlan = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      backupPath: this.rollbackBackupPath,
      currentVersion: process.env.npm_package_version,
      rollbackCommands: [
        'pm2 stop jobscrapper-backend',
        `node scripts/db-restore.js restore "${this.rollbackBackupPath}"`,
        'pm2 start jobscrapper-backend',
        'pm2 logs jobscrapper-backend --lines 50'
      ],
      rollbackInstructions: 'Run the above commands in order if rollback is needed'
    };
    
    const fs = require('fs').promises;
    const rollbackPath = path.join(__dirname, '..', 'rollback-plan.json');
    await fs.writeFile(rollbackPath, JSON.stringify(rollbackPlan, null, 2));
    
    console.log(`✅ Rollback plan created: ${rollbackPath}`);
  }

  async notifyProductionDeploymentStart() {
    console.log('📢 Notifying production deployment start...');
    
    const notifications = [
      this.sendWebhookNotification('deployment_started'),
      this.sendEmailNotification('Production Deployment Started'),
      this.logDeploymentEvent('started')
    ];
    
    await Promise.allSettled(notifications);
  }

  async postDeploy() {
    console.log('🔧 Running post-deployment tasks...');
    
    await this.validateProductionDeployment();
    await this.runProductionHealthChecks();
    await this.warmupApplication();
    await this.notifyProductionDeploymentComplete();
    await this.cleanupOldBackups();
  }

  async validateProductionDeployment() {
    console.log('✅ Validating production deployment...');
    
    // Test critical API endpoints
    const criticalEndpoints = [
      '/health',
      '/api/jobs',
      '/api/applications',
      '/api/users',
      '/api/analytics'
    ];
    
    const baseUrl = process.env.API_BASE_URL || 'https://api.yourapp.com';
    
    for (const endpoint of criticalEndpoints) {
      await this.testProductionEndpoint(`${baseUrl}${endpoint}`);
    }
    
    console.log('✅ All production endpoints are responding');
  }

  async runProductionHealthChecks() {
    console.log('🩺 Running production health checks...');
    
    const healthChecks = [
      this.checkDatabasePerformance,
      this.checkMemoryUsage,
      this.checkCPUUsage,
      this.checkDiskSpace,
      this.checkLogErrors
    ];
    
    for (const check of healthChecks) {
      await check.call(this);
    }
    
    console.log('✅ Production health checks completed');
  }

  async checkDatabasePerformance() {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        console.warn(`⚠️  Database response time is high: ${responseTime}ms`);
      } else {
        console.log(`✅ Database response time: ${responseTime}ms`);
      }
    } finally {
      await mongoose.disconnect();
    }
  }

  async checkMemoryUsage() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('pm2 jlist', { encoding: 'utf8' });
      const processes = JSON.parse(output);
      const app = processes.find(p => p.name === 'jobscrapper-backend');
      
      if (app && app.monit) {
        const memoryMB = Math.round(app.monit.memory / 1024 / 1024);
        const threshold = parseInt(process.env.MEMORY_ALERT_THRESHOLD) || 512;
        
        if (memoryMB > threshold) {
          console.warn(`⚠️  High memory usage: ${memoryMB}MB`);
        } else {
          console.log(`✅ Memory usage: ${memoryMB}MB`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not check memory usage:', error.message);
    }
  }

  async checkCPUUsage() {
    // CPU check implementation would depend on your monitoring setup
    console.log('✅ CPU usage check - implement based on your monitoring system');
  }

  async checkDiskSpace() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.split('\n');
      const diskInfo = lines[1].split(/\s+/);
      const usagePercent = parseInt(diskInfo[4]);
      
      if (usagePercent > 90) {
        console.warn(`⚠️  High disk usage: ${usagePercent}%`);
      } else {
        console.log(`✅ Disk usage: ${usagePercent}%`);
      }
    } catch (error) {
      console.warn('⚠️  Could not check disk space:', error.message);
    }
  }

  async checkLogErrors() {
    try {
      const { execSync } = require('child_process');
      const errorCount = execSync('pm2 logs jobscrapper-backend --lines 100 --nostream | grep -i error | wc -l', { encoding: 'utf8' });
      
      const errors = parseInt(errorCount.trim());
      if (errors > 5) {
        console.warn(`⚠️  Found ${errors} recent errors in logs`);
      } else {
        console.log(`✅ Log errors: ${errors} recent errors`);
      }
    } catch (error) {
      console.warn('⚠️  Could not check log errors:', error.message);
    }
  }

  async warmupApplication() {
    console.log('🔥 Warming up application...');
    
    const baseUrl = process.env.API_BASE_URL || 'https://api.yourapp.com';
    const warmupEndpoints = [
      '/health',
      '/api/jobs?limit=1',
      '/api/applications?limit=1'
    ];
    
    for (const endpoint of warmupEndpoints) {
      try {
        await this.testProductionEndpoint(`${baseUrl}${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
      } catch (error) {
        console.warn(`⚠️  Warmup failed for ${endpoint}:`, error.message);
      }
    }
    
    console.log('✅ Application warmup completed');
  }

  async notifyProductionDeploymentComplete() {
    console.log('📢 Notifying production deployment completion...');
    
    const notifications = [
      this.sendWebhookNotification('deployment_completed'),
      this.sendEmailNotification('Production Deployment Completed Successfully'),
      this.logDeploymentEvent('completed')
    ];
    
    await Promise.allSettled(notifications);
    
    console.log('🎉 Production deployment completed successfully!');
    console.log('🌐 Production URL: https://api.yourapp.com');
    console.log('📊 Monitor: https://your-monitoring-dashboard.com');
    console.log('📱 Chrome Extension should now connect to production API');
  }

  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    try {
      const DatabaseBackup = require('./db-backup');
      const backup = new DatabaseBackup();
      await backup.cleanupOldBackups(30); // Keep 30 days of backups
    } catch (error) {
      console.warn('⚠️  Backup cleanup failed:', error.message);
    }
  }

  async testProductionEndpoint(url, timeout = 10000) {
    try {
      const fetch = require('node-fetch').default;
      const response = await fetch(url, { timeout });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ ${url} - OK`);
    } catch (error) {
      console.error(`❌ ${url} - Failed: ${error.message}`);
      throw error;
    }
  }

  async sendWebhookNotification(event) {
    const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    try {
      const fetch = require('node-fetch').default;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: `production_${event}`,
          environment: 'production',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version,
          url: process.env.API_BASE_URL
        })
      });
    } catch (error) {
      console.warn('⚠️  Webhook notification failed:', error.message);
    }
  }

  async sendEmailNotification(subject) {
    // Implement email notification based on your email service
    console.log(`📧 Email notification: ${subject}`);
  }

  async logDeploymentEvent(status) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'production_deployment',
      status,
      version: process.env.npm_package_version,
      environment: 'production'
    };
    
    console.log('📝 Deployment event logged:', JSON.stringify(logEntry));
  }
}

// CLI Interface
async function main() {
  const deployment = new ProductionDeployment();
  
  try {
    console.log('🚀 JobScrapper Production Deployment');
    console.log('====================================');
    
    await deployment.deploy();
    
    console.log('');
    console.log('🎉 PRODUCTION DEPLOYMENT SUCCESSFUL! 🎉');
    console.log('=======================================');
    console.log('🌐 API URL: https://api.yourapp.com');
    console.log('📱 Chrome Extension is now live');
    console.log('📊 Monitor: pm2 logs jobscrapper-backend');
    console.log('🔄 Rollback plan: ./rollback-plan.json');
    
  } catch (error) {
    console.error('❌ PRODUCTION DEPLOYMENT FAILED:', error);
    console.error('🔄 Check rollback-plan.json for recovery instructions');
    process.exit(1);
  }
}

if (require.main === module) {
  // Load production environment variables
  require('dotenv').config({ path: '.env.production' });
  main();
}

module.exports = ProductionDeployment;
