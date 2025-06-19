#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps configure environment variables and initial setup
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

class EnvironmentSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async generateSecret(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('base64');
  }

  async setupEnvironment(env = 'development') {
    console.log(`🔧 Setting up ${env} environment...`);
    console.log('=====================================');
    
    const envFile = `.env.${env}`;
    const envPath = path.join(__dirname, '..', envFile);
    
    try {
      // Check if environment file already exists
      await fs.access(envPath);
      const overwrite = await this.question(`${envFile} already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        return;
      }
    } catch {
      // File doesn't exist, continue
    }
    
    const config = await this.collectConfiguration(env);
    await this.writeEnvironmentFile(envPath, config);
    
    console.log(`✅ ${envFile} created successfully!`);
    
    // Copy to .env if it's the default environment
    if (env === 'development') {
      const copyToDefault = await this.question('Copy to .env for default usage? (Y/n): ');
      if (copyToDefault.toLowerCase() !== 'n' && copyToDefault.toLowerCase() !== 'no') {
        await fs.copyFile(envPath, path.join(__dirname, '..', '.env'));
        console.log('✅ Copied to .env');
      }
    }
  }

  async collectConfiguration(env) {
    const config = {};
    
    console.log('\n📋 Configuration Setup');
    console.log('======================');
    
    // Database Configuration
    console.log('\n🗃️  Database Configuration:');
    
    if (env === 'production') {
      config.MONGODB_URI = await this.question('MongoDB URI (production): ');
    } else {
      const defaultDb = `mongodb://localhost:27017/jobscrapper_${env}`;
      const mongoUri = await this.question(`MongoDB URI (${defaultDb}): `);
      config.MONGODB_URI = mongoUri || defaultDb;
    }
    
    // Security Configuration
    console.log('\n🔐 Security Configuration:');
    
    const generateSecrets = await this.question('Generate secure secrets automatically? (Y/n): ');
    if (generateSecrets.toLowerCase() !== 'n' && generateSecrets.toLowerCase() !== 'no') {
      config.JWT_SECRET = await this.generateSecret();
      config.SESSION_SECRET = await this.generateSecret();
      console.log('✅ Secure secrets generated');
    } else {
      config.JWT_SECRET = await this.question('JWT Secret: ');
      config.SESSION_SECRET = await this.question('Session Secret: ');
    }
    
    // Server Configuration
    console.log('\n🌐 Server Configuration:');
    
    const defaultPort = env === 'staging' ? '5001' : '5000';
    const port = await this.question(`Server Port (${defaultPort}): `);
    config.PORT = port || defaultPort;
    
    if (env === 'production') {
      config.HOST = '0.0.0.0';
      config.API_BASE_URL = await this.question('API Base URL (https://api.yourdomain.com/api): ');
      config.CORS_ORIGINS = await this.question('CORS Origins (comma-separated): ');
    } else {
      config.HOST = 'localhost';
      config.API_BASE_URL = `http://localhost:${config.PORT}/api`;
      config.CORS_ORIGINS = 'http://localhost:3000,chrome-extension://';
    }
    
    // Environment-specific settings
    config.NODE_ENV = env;
    config.LOG_LEVEL = env === 'production' ? 'warn' : env === 'staging' ? 'info' : 'debug';
    config.DEBUG = env === 'development' ? 'true' : 'false';
    
    // Email Configuration (optional)
    console.log('\n📧 Email Configuration (optional):');
    const setupEmail = await this.question('Setup email notifications? (y/N): ');
    if (setupEmail.toLowerCase() === 'y' || setupEmail.toLowerCase() === 'yes') {
      config.EMAIL_SERVICE = await this.question('Email Service (gmail): ') || 'gmail';
      config.EMAIL_USER = await this.question('Email User: ');
      config.EMAIL_PASS = await this.question('Email Password/App Password: ');
    }
    
    return config;
  }

  async writeEnvironmentFile(filePath, config) {
    const template = await this.generateEnvironmentTemplate(config);
    await fs.writeFile(filePath, template);
  }

  async generateEnvironmentTemplate(config) {
    const env = config.NODE_ENV;
    
    return `# ${env.charAt(0).toUpperCase() + env.slice(1)} Environment Configuration
# Generated on ${new Date().toISOString()}

# ==============================================
# ENVIRONMENT
# ==============================================
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}
HOST=${config.HOST || 'localhost'}

# ==============================================
# DATABASE
# ==============================================
MONGODB_URI=${config.MONGODB_URI}
DB_NAME=${config.DB_NAME || `jobscrapper${env !== 'production' ? '_' + env : ''}`}

# ==============================================
# SECURITY
# ==============================================
JWT_SECRET=${config.JWT_SECRET}
JWT_EXPIRES_IN=${config.JWT_EXPIRES_IN || (env === 'production' ? '1h' : '7d')}
SESSION_SECRET=${config.SESSION_SECRET}

# ==============================================
# API CONFIGURATION
# ==============================================
API_BASE_URL=${config.API_BASE_URL}
WS_BASE_URL=${config.WS_BASE_URL || config.API_BASE_URL?.replace('/api', '').replace('http', 'ws') || 'ws://localhost:' + config.PORT}
CORS_ORIGINS=${config.CORS_ORIGINS}

# ==============================================
# LOGGING
# ==============================================
LOG_LEVEL=${config.LOG_LEVEL}
LOG_DIR=./logs
ENABLE_PERFORMANCE_MONITORING=true

# ==============================================
# DEVELOPMENT SETTINGS
# ==============================================
DEBUG=${config.DEBUG}
USE_MOCK_DATA=false
DISABLE_AUTH=false
DETAILED_ERRORS=${env !== 'production' ? 'true' : 'false'}

# ==============================================
# RATE LIMITING
# ==============================================
RATE_LIMIT_LINKEDIN=${env === 'development' ? '60' : '20'}
RATE_LIMIT_INDEED=${env === 'development' ? '60' : '30'}
RATE_LIMIT_GLASSDOOR=${env === 'development' ? '60' : '25'}
RATE_LIMIT_GOOGLE_JOBS=${env === 'development' ? '60' : '40'}
RATE_LIMIT_ZIPRECRUITER=${env === 'development' ? '60' : '25'}
RATE_LIMIT_MONSTER=${env === 'development' ? '60' : '20'}

# ==============================================
# STEALTH SETTINGS
# ==============================================
STEALTH_DELAY_MIN=${env === 'production' ? '2000' : '1000'}
STEALTH_DELAY_MAX=${env === 'production' ? '5000' : '3000'}
STEALTH_RANDOM_DELAY=true

# ==============================================
# BACKUP
# ==============================================
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=${env === 'production' ? '30' : '7'}
${env !== 'development' ? 'BACKUP_SCHEDULE=0 2 * * *' : '# BACKUP_SCHEDULE=0 2 * * *'}

# ==============================================
# CACHE
# ==============================================
CACHE_TTL=${env === 'production' ? '7200' : '3600'}
ENABLE_QUERY_CACHE=true
${config.REDIS_URL ? `REDIS_URL=${config.REDIS_URL}` : '# REDIS_URL=redis://localhost:6379'}

# ==============================================
# PERFORMANCE MONITORING
# ==============================================
CPU_ALERT_THRESHOLD=${env === 'production' ? '80' : '90'}
MEMORY_ALERT_THRESHOLD=${env === 'production' ? '512' : '256'}

# ==============================================
# PM2
# ==============================================
PM2_APP_NAME=jobscrapper-${env === 'production' ? 'backend' : env}

# ==============================================
# EMAIL NOTIFICATIONS
# ==============================================
${config.EMAIL_SERVICE ? `EMAIL_SERVICE=${config.EMAIL_SERVICE}` : '# EMAIL_SERVICE=gmail'}
${config.EMAIL_USER ? `EMAIL_USER=${config.EMAIL_USER}` : '# EMAIL_USER=your-email@gmail.com'}
${config.EMAIL_PASS ? `EMAIL_PASS=${config.EMAIL_PASS}` : '# EMAIL_PASS=your-app-password'}

# ==============================================
# THIRD-PARTY SERVICES
# ==============================================
${config.WEBHOOK_URL ? `WEBHOOK_URL=${config.WEBHOOK_URL}` : '# WEBHOOK_URL=https://your-webhook-url'}
${config.DEPLOY_WEBHOOK_URL ? `DEPLOY_WEBHOOK_URL=${config.DEPLOY_WEBHOOK_URL}` : '# DEPLOY_WEBHOOK_URL=https://your-deployment-webhook-url'}
${config.ANALYTICS_API_KEY ? `ANALYTICS_API_KEY=${config.ANALYTICS_API_KEY}` : '# ANALYTICS_API_KEY=your-analytics-api-key'}
${config.SENTRY_DSN ? `SENTRY_DSN=${config.SENTRY_DSN}` : '# SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id'}

# ==============================================
# SSL/TLS (Production only)
# ==============================================
${env === 'production' ? `# SSL_CERT_PATH=/etc/ssl/certs/yourapp.crt
# SSL_KEY_PATH=/etc/ssl/private/yourapp.key` : '# SSL configuration not needed for ' + env}

# ==============================================
# CHROME WEB STORE (Production only)
# ==============================================
${env === 'production' ? `# CWS_CLIENT_ID=your-chrome-web-store-client-id
# CWS_CLIENT_SECRET=your-chrome-web-store-client-secret
# CWS_REFRESH_TOKEN=your-chrome-web-store-refresh-token
# CWS_EXTENSION_ID=your-chrome-web-store-extension-id` : '# Chrome Web Store configuration not needed for ' + env}

# ==============================================
# HEALTH CHECK
# ==============================================
HEALTH_CHECK_URL=/health
`;
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'npm', command: 'npm --version', required: true },
      { name: 'MongoDB', command: 'mongod --version', required: true },
      { name: 'PM2', command: 'pm2 --version', required: false },
      { name: 'Git', command: 'git --version', required: false }
    ];
    
    const results = [];
    
    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf8', stdio: 'pipe' });
        results.push({
          name: check.name,
          status: 'installed',
          version: version.trim().split('\n')[0]
        });
        console.log(`✅ ${check.name}: ${version.trim().split('\n')[0]}`);
      } catch (error) {
        results.push({
          name: check.name,
          status: 'missing',
          required: check.required
        });
        
        const icon = check.required ? '❌' : '⚠️';
        console.log(`${icon} ${check.name}: Not installed ${check.required ? '(REQUIRED)' : '(optional)'}`);
      }
    }
    
    const missingRequired = results.filter(r => r.status === 'missing' && r.required);
    
    if (missingRequired.length > 0) {
      console.log('\n❌ Missing required dependencies:');
      for (const dep of missingRequired) {
        console.log(`   - ${dep.name}`);
      }
      console.log('\nPlease install the missing dependencies before continuing.');
      return false;
    }
    
    console.log('\n✅ All prerequisites met!');
    return true;
  }

  async setupDirectories() {
    console.log('📁 Setting up directories...');
    
    const directories = [
      'logs',
      'backups',
      'dist',
      'migrations'
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(__dirname, '..', dir);
      
      try {
        await fs.access(dirPath);
        console.log(`✅ ${dir}: Already exists`);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`✅ ${dir}: Created`);
      }
    }
  }

  async installDependencies() {
    console.log('📦 Installing dependencies...');
    
    const installAll = await this.question('Install all dependencies (root, backend, frontend)? (Y/n): ');
    if (installAll.toLowerCase() !== 'n' && installAll.toLowerCase() !== 'no') {
      try {
        console.log('Installing root dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        
        console.log('Installing backend dependencies...');
        execSync('npm install', { cwd: 'backend', stdio: 'inherit' });
        
        console.log('Installing frontend dependencies...');
        execSync('npm install', { cwd: 'frontend', stdio: 'inherit' });
        
        console.log('✅ All dependencies installed!');
      } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message);
      }
    }
  }

  async close() {
    this.rl.close();
  }
}

// CLI Interface
async function main() {
  const setup = new EnvironmentSetup();
  
  try {
    console.log('🚀 JobScrapper Environment Setup');
    console.log('================================');
    
    const command = process.argv[2] || 'interactive';
    const environment = process.argv[3] || 'development';
    
    switch (command) {
      case 'check':
        await setup.checkPrerequisites();
        break;
        
      case 'directories':
        await setup.setupDirectories();
        break;
        
      case 'install':
        await setup.installDependencies();
        break;
        
      case 'env':
        await setup.setupEnvironment(environment);
        break;
        
      case 'full':
        const prereqsOk = await setup.checkPrerequisites();
        if (!prereqsOk) break;
        
        await setup.setupDirectories();
        await setup.setupEnvironment(environment);
        await setup.installDependencies();
        
        console.log('\n🎉 Full setup completed!');
        console.log('Next steps:');
        console.log('1. Review your .env file');
        console.log('2. Start MongoDB service');
        console.log('3. Run: npm run db:migrate');
        console.log('4. Run: npm run dev');
        break;
        
      case 'interactive':
      default:
        console.log('Choose setup option:');
        console.log('1. Full setup (recommended for new installs)');
        console.log('2. Environment configuration only');
        console.log('3. Check prerequisites');
        console.log('4. Setup directories');
        console.log('5. Install dependencies');
        
        const choice = await setup.question('\nEnter choice (1-5): ');
        
        switch (choice) {
          case '1':
            const prereqsOk = await setup.checkPrerequisites();
            if (!prereqsOk) break;
            
            await setup.setupDirectories();
            await setup.setupEnvironment('development');
            await setup.installDependencies();
            break;
            
          case '2':
            const env = await setup.question('Environment (development/staging/production): ') || 'development';
            await setup.setupEnvironment(env);
            break;
            
          case '3':
            await setup.checkPrerequisites();
            break;
            
          case '4':
            await setup.setupDirectories();
            break;
            
          case '5':
            await setup.installDependencies();
            break;
            
          default:
            console.log('Invalid choice');
            break;
        }
        break;
    }
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await setup.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = EnvironmentSetup;
