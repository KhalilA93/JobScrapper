# JobScrapper Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the JobScrapper Chrome extension and backend API across different environments (development, staging, production).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Chrome Extension Deployment](#chrome-extension-deployment)
- [Backend API Deployment](#backend-api-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **MongoDB**: 6.x or higher
- **PM2**: For production process management
- **MongoDB Tools**: For database backup/restore

### Development Tools

- **Git**: Version control
- **VS Code**: Recommended IDE
- **Chrome Browser**: For extension testing
- **Postman**: API testing (optional)

### Production Requirements

- **SSL Certificate**: For HTTPS
- **Domain Name**: For production deployment
- **Email Service**: For notifications
- **Monitoring Tools**: For system monitoring

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/jobscrapper.git
cd jobscrapper
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (root, backend, frontend)
npm run install:all
```

### 3. Environment Configuration

Copy the appropriate environment template:

```bash
# Development
cp .env.development .env

# Staging
cp .env.staging .env

# Production
cp .env.production .env
```

### 4. Configure Environment Variables

Edit the `.env` file and replace placeholder values:

#### Critical Production Variables

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobscrapper

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret-here

# API
API_BASE_URL=https://api.yourdomain.com/api
CORS_ORIGINS=https://yourdomain.com,chrome-extension://your-extension-id

# SSL (Production only)
SSL_CERT_PATH=/path/to/ssl/certificate.crt
SSL_KEY_PATH=/path/to/ssl/private.key
```

## Database Setup

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows:**
Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### 2. Create Database

```bash
# Connect to MongoDB
mongo

# Create database and user
use jobscrapper
db.createUser({
  user: "jobscrapper_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

### 3. Run Database Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
node scripts/db-migrate.js status
```

### 4. Create Initial Data (Optional)

```bash
# Seed database with sample data
node scripts/db-seed.js
```

## Chrome Extension Deployment

### 1. Development Build

```bash
# Build for development
npm run build:extension:dev

# Watch mode for development
npm run build:extension:watch
```

### 2. Load Extension in Chrome

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

### 3. Staging Build

```bash
# Build for staging
npm run build:staging

# Package for testing
npm run package:staging
```

### 4. Production Build

```bash
# Build for production
npm run build:prod

# Package for Chrome Web Store
npm run package:prod
```

### 5. Chrome Web Store Submission

1. **Prepare Assets:**
   - Extension zip file
   - Screenshots (1280x800)
   - Store listing images
   - Privacy policy URL

2. **Submit to Chrome Web Store:**
   ```bash
   # Automated submission (requires API setup)
   node scripts/package-extension.js --submit
   ```

3. **Manual Submission:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Upload extension zip
   - Fill out store listing
   - Submit for review

## Backend API Deployment

### 1. Development Server

```bash
# Start development server
npm run dev:backend

# Or with hot reload
cd backend
npm run dev
```

### 2. Production Build

```bash
# Build backend for production
cd backend
npm run build
```

### 3. Install PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 4. Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging
```

### 5. Deploy to Production

```bash
# Deploy to production (requires confirmation)
npm run deploy:prod
```

### 6. Manual Production Deployment

```bash
# 1. Create production build
NODE_ENV=production npm run build

# 2. Run database migrations
npm run db:migrate

# 3. Start with PM2
pm2 start ecosystem.config.js --env production

# 4. Save PM2 configuration
pm2 save
```

## Monitoring and Maintenance

### 1. Process Monitoring

```bash
# View running processes
pm2 list

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart application
pm2 restart jobscrapper-backend
```

### 2. Database Maintenance

```bash
# Create backup
npm run db:backup

# Create compressed backup
node scripts/db-backup.js create --compress

# List backups
npm run db:backup list

# Restore from backup
node scripts/db-restore.js restore ./backups/backup-name

# Cleanup old backups (keep 30 days)
node scripts/db-backup.js cleanup 30
```

### 3. Health Checks

```bash
# Check API health
curl https://api.yourdomain.com/health

# Check database connection
node scripts/health-check.js database

# Check all services
node scripts/health-check.js all
```

### 4. Log Management

```bash
# View application logs
pm2 logs jobscrapper-backend --lines 100

# View error logs only
pm2 logs jobscrapper-backend --err

# Rotate logs
pm2 install pm2-logrotate
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Rotate secrets regularly
- Use environment-specific configurations

### 2. Database Security

- Use strong database passwords
- Enable MongoDB authentication
- Configure firewall rules
- Regular security updates

### 3. SSL/TLS Configuration

```bash
# Generate SSL certificate (Let's Encrypt example)
sudo certbot certonly --standalone -d api.yourdomain.com

# Configure nginx proxy (optional)
sudo nano /etc/nginx/sites-available/jobscrapper
```

### 4. Chrome Extension Security

- Follow Chrome Web Store policies
- Implement proper content security policy
- Validate all user inputs
- Use HTTPS for all API calls

## Troubleshooting

### Common Issues

#### 1. Extension Not Loading

```bash
# Check build output
npm run build:extension:dev
# Check console for errors in chrome://extensions/
```

#### 2. API Connection Issues

```bash
# Check if backend is running
curl http://localhost:5000/health

# Check environment variables
node -e "console.log(process.env.API_BASE_URL)"

# Check CORS configuration
```

#### 3. Database Connection Issues

```bash
# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"

# Check MongoDB service
sudo systemctl status mongod
```

#### 4. PM2 Issues

```bash
# Restart PM2
pm2 kill
pm2 resurrect

# Reset PM2 configuration
pm2 delete all
pm2 start ecosystem.config.js
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment
export DEBUG=jobscrapper:*

# Run with debug output
npm run dev:backend
```

### Log Locations

- **Application Logs**: `./logs/`
- **PM2 Logs**: `~/.pm2/logs/`
- **MongoDB Logs**: `/var/log/mongodb/`
- **System Logs**: `/var/log/syslog`

## Performance Optimization

### 1. Database Optimization

```bash
# Run database optimization
node scripts/optimize-database.js

# Create indexes
npm run db:migrate

# Analyze slow queries
node scripts/analyze-queries.js
```

### 2. Application Performance

```bash
# Enable performance monitoring
export ENABLE_PERFORMANCE_MONITORING=true

# Monitor application metrics
pm2 monit
```

### 3. Chrome Extension Performance

- Minimize background script activity
- Use efficient DOM querying
- Implement proper caching
- Monitor memory usage

## Backup and Recovery

### 1. Automated Backups

```bash
# Setup cron job for automated backups
crontab -e

# Add backup schedule (daily at 2 AM)
0 2 * * * cd /path/to/jobscrapper && npm run db:backup >> /var/log/backup.log 2>&1
```

### 2. Disaster Recovery

```bash
# Full system restore
1. Restore database: node scripts/db-restore.js restore ./backups/latest-backup
2. Deploy application: npm run deploy:prod
3. Verify health: curl https://api.yourdomain.com/health
```

## Support and Documentation

- **API Documentation**: `/docs/api/`
- **Extension Documentation**: `/docs/extension/`
- **Issue Tracker**: GitHub Issues
- **Support Email**: support@yourdomain.com

---

For additional help, please refer to the individual component documentation or contact the development team.
