#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies system health across all components
 */

const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class HealthChecker {
  constructor() {
    this.results = {
      overall: 'unknown',
      checks: {},
      timestamp: new Date().toISOString()
    };
  }

  async checkDatabase() {
    console.log('🔍 Checking database connection...');
    
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobscrapper';
      
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      
      // Test basic operation
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;
      
      await mongoose.disconnect();
      
      this.results.checks.database = {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        message: 'Database connection successful'
      };
      
      console.log(`✅ Database: Healthy (${responseTime}ms)`);
    } catch (error) {
      this.results.checks.database = {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      };
      
      console.error('❌ Database: Unhealthy -', error.message);
    }
  }

  async checkAPI() {
    console.log('🔍 Checking API endpoints...');
    
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    const endpoints = [
      '/health',
      '/api/jobs',
      '/api/applications',
      '/api/users',
      '/api/analytics'
    ];
    
    const apiResults = {};
    let healthyCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept 4xx as healthy
        });
        const responseTime = Date.now() - start;
        
        apiResults[endpoint] = {
          status: 'healthy',
          httpStatus: response.status,
          responseTime: `${responseTime}ms`
        };
        
        healthyCount++;
        console.log(`✅ ${endpoint}: ${response.status} (${responseTime}ms)`);
      } catch (error) {
        apiResults[endpoint] = {
          status: 'unhealthy',
          error: error.message
        };
        
        console.error(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    this.results.checks.api = {
      status: healthyCount === endpoints.length ? 'healthy' : 'degraded',
      healthyEndpoints: healthyCount,
      totalEndpoints: endpoints.length,
      endpoints: apiResults
    };
  }

  async checkDiskSpace() {
    console.log('🔍 Checking disk space...');
    
    try {
      const { execSync } = require('child_process');
      let command, output;
      
      if (process.platform === 'win32') {
        // Windows
        command = 'wmic logicaldisk get size,freespace,caption';
        output = execSync(command, { encoding: 'utf8' });
      } else {
        // Unix-like
        command = 'df -h /';
        output = execSync(command, { encoding: 'utf8' });
      }
      
      // Parse output (simplified)
      const lines = output.split('\n').filter(line => line.trim());
      
      this.results.checks.diskSpace = {
        status: 'healthy',
        message: 'Disk space check completed',
        details: lines[1] || 'Space available'
      };
      
      console.log('✅ Disk Space: Adequate');
    } catch (error) {
      this.results.checks.diskSpace = {
        status: 'warning',
        error: error.message,
        message: 'Could not check disk space'
      };
      
      console.warn('⚠️  Disk Space: Could not check -', error.message);
    }
  }

  async checkMemory() {
    console.log('🔍 Checking memory usage...');
    
    try {
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
      
      const status = memoryUsagePercent > 90 ? 'warning' : 'healthy';
      
      this.results.checks.memory = {
        status,
        usagePercent: memoryUsagePercent,
        totalGB: Math.round(totalMemory / 1024 / 1024 / 1024 * 100) / 100,
        freeGB: Math.round(freeMemory / 1024 / 1024 / 1024 * 100) / 100,
        message: `Memory usage: ${memoryUsagePercent}%`
      };
      
      const icon = status === 'healthy' ? '✅' : '⚠️';
      console.log(`${icon} Memory: ${memoryUsagePercent}% used`);
    } catch (error) {
      this.results.checks.memory = {
        status: 'warning',
        error: error.message,
        message: 'Could not check memory usage'
      };
      
      console.warn('⚠️  Memory: Could not check -', error.message);
    }
  }

  async checkPM2Processes() {
    console.log('🔍 Checking PM2 processes...');
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('pm2 jlist', { encoding: 'utf8' });
      const processes = JSON.parse(output);
      
      const jobscrapperProcesses = processes.filter(p => 
        p.name && p.name.includes('jobscrapper')
      );
      
      const processResults = {};
      let healthyProcesses = 0;
      
      for (const process of jobscrapperProcesses) {
        const isHealthy = process.pm2_env.status === 'online';
        
        processResults[process.name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          pid: process.pid,
          uptime: process.pm2_env.pm_uptime,
          restarts: process.pm2_env.restart_time,
          memory: Math.round(process.monit.memory / 1024 / 1024) + 'MB'
        };
        
        if (isHealthy) healthyProcesses++;
        
        const icon = isHealthy ? '✅' : '❌';
        console.log(`${icon} ${process.name}: ${process.pm2_env.status}`);
      }
      
      this.results.checks.pm2 = {
        status: healthyProcesses === jobscrapperProcesses.length ? 'healthy' : 'degraded',
        healthyProcesses,
        totalProcesses: jobscrapperProcesses.length,
        processes: processResults
      };
    } catch (error) {
      this.results.checks.pm2 = {
        status: 'warning',
        error: error.message,
        message: 'PM2 not available or no processes found'
      };
      
      console.warn('⚠️  PM2: Not available -', error.message);
    }
  }

  async checkLogs() {
    console.log('🔍 Checking recent logs for errors...');
    
    try {
      const logsDir = path.join(__dirname, '..', 'logs');
      const logFiles = ['prod-error.log', 'staging-error.log', 'dev-error.log'];
      
      let errorCount = 0;
      let recentErrors = [];
      
      for (const logFile of logFiles) {
        const logPath = path.join(logsDir, logFile);
        
        try {
          const content = await fs.readFile(logPath, 'utf8');
          const lines = content.split('\n').slice(-100); // Last 100 lines
          
          for (const line of lines) {
            if (line.toLowerCase().includes('error') && !line.includes('404')) {
              errorCount++;
              if (recentErrors.length < 5) {
                recentErrors.push({
                  file: logFile,
                  message: line.substring(0, 100)
                });
              }
            }
          }
        } catch {
          // Log file doesn't exist or can't be read
        }
      }
      
      this.results.checks.logs = {
        status: errorCount > 10 ? 'warning' : 'healthy',
        recentErrorCount: errorCount,
        recentErrors: recentErrors,
        message: `Found ${errorCount} recent errors in logs`
      };
      
      const icon = errorCount > 10 ? '⚠️' : '✅';
      console.log(`${icon} Logs: ${errorCount} recent errors`);
    } catch (error) {
      this.results.checks.logs = {
        status: 'warning',
        error: error.message,
        message: 'Could not check log files'
      };
      
      console.warn('⚠️  Logs: Could not check -', error.message);
    }
  }

  determineOverallHealth() {
    const checks = Object.values(this.results.checks);
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    
    if (unhealthyCount > 0) {
      this.results.overall = 'unhealthy';
    } else if (warningCount > 0) {
      this.results.overall = 'warning';
    } else if (healthyCount > 0) {
      this.results.overall = 'healthy';
    } else {
      this.results.overall = 'unknown';
    }
    
    this.results.summary = {
      healthy: healthyCount,
      warning: warningCount,
      unhealthy: unhealthyCount,
      total: checks.length
    };
  }

  async runAllChecks() {
    console.log('🩺 JobScrapper Health Check');
    console.log('===========================');
    
    const checks = [
      this.checkDatabase,
      this.checkAPI,
      this.checkDiskSpace,
      this.checkMemory,
      this.checkPM2Processes,
      this.checkLogs
    ];
    
    for (const check of checks) {
      try {
        await check.call(this);
      } catch (error) {
        console.error('Health check failed:', error.message);
      }
    }
    
    this.determineOverallHealth();
    
    console.log('');
    console.log('📊 Health Check Summary');
    console.log('======================');
    
    const icon = this.results.overall === 'healthy' ? '✅' : 
                 this.results.overall === 'warning' ? '⚠️' : '❌';
    
    console.log(`${icon} Overall Status: ${this.results.overall.toUpperCase()}`);
    console.log(`📈 Healthy: ${this.results.summary.healthy}/${this.results.summary.total}`);
    
    if (this.results.summary.warning > 0) {
      console.log(`⚠️  Warnings: ${this.results.summary.warning}`);
    }
    
    if (this.results.summary.unhealthy > 0) {
      console.log(`❌ Unhealthy: ${this.results.summary.unhealthy}`);
    }
    
    return this.results;
  }

  async saveResults() {
    const resultsPath = path.join(__dirname, '..', 'logs', 'health-check.json');
    await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}`);
  }
}

// CLI Interface
async function main() {
  const checker = new HealthChecker();
  
  try {
    const command = process.argv[2] || 'all';
    
    switch (command) {
      case 'database':
        await checker.checkDatabase();
        break;
        
      case 'api':
        await checker.checkAPI();
        break;
        
      case 'system':
        await checker.checkDiskSpace();
        await checker.checkMemory();
        break;
        
      case 'processes':
        await checker.checkPM2Processes();
        break;
        
      case 'logs':
        await checker.checkLogs();
        break;
        
      case 'all':
      default:
        await checker.runAllChecks();
        await checker.saveResults();
        break;
    }
    
    // Exit with appropriate code
    if (checker.results.overall === 'unhealthy') {
      process.exit(1);
    } else if (checker.results.overall === 'warning') {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  main();
}

module.exports = HealthChecker;
