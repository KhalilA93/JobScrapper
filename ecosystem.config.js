/**
 * PM2 Ecosystem Configuration
 * Defines process management settings for different environments
 */

module.exports = {
  apps: [
    // Development Environment
    {
      name: 'jobscrapper-dev',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: true,
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        'backups',
        '.git'
      ],
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        MONGODB_URI: 'mongodb://localhost:27017/jobscrapper_dev'
      },
      error_file: './logs/dev-error.log',
      out_file: './logs/dev-out.log',
      log_file: './logs/dev-combined.log',
      time: true,
      max_memory_restart: '500M'
    },

    // Staging Environment
    {
      name: 'jobscrapper-staging',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'staging',
        PORT: 5001,
        MONGODB_URI: 'mongodb://localhost:27017/jobscrapper_staging'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5001
      },
      error_file: './logs/staging-error.log',
      out_file: './logs/staging-out.log',
      log_file: './logs/staging-combined.log',
      time: true,
      max_memory_restart: '800M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // Production Environment
    {
      name: 'jobscrapper-backend',
      script: './backend/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/prod-error.log',
      out_file: './logs/prod-out.log',
      log_file: './logs/prod-combined.log',
      time: true,
      max_memory_restart: '1G',
      min_uptime: '60s',
      max_restarts: 5,
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto-restart on specific exit codes
      autorestart: true,
      
      // Graceful shutdown
      kill_retry_timeout: 5000,
      
      // Health monitoring
      health: {
        url: 'http://localhost:5000/health',
        interval: 30000, // 30 seconds
        timeout: 5000,
        max_fails: 3
      }
    },

    // Background Job Processor (if needed)
    {
      name: 'jobscrapper-worker',
      script: './backend/workers/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
      
      // Only start in production
      env_development: {
        NODE_ENV: 'development',
        disabled: true
      }
    }
  ],

  deploy: {
    // Production deployment configuration
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/jobscrapper.git',
      path: '/var/www/jobscrapper',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm mongodb-org',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Staging deployment configuration
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/yourusername/jobscrapper.git',
      path: '/var/www/jobscrapper-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:staging && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': 'apt update && apt install nodejs npm mongodb-org',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
