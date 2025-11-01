/**
 * PM2 Ecosystem Configuration for Pixology
 *
 * This unified monolithic application includes:
 * - React Frontend (Landing, Login, Storyline Dashboard)
 * - Express Backend (OAuth, API endpoints)
 * - Single server serving everything on configured port
 *
 * Usage:
 *   Production:  pm2 start ecosystem.config.cjs --env production
 *   Staging:     pm2 start ecosystem.config.cjs --env staging
 *   Development: pm2 start ecosystem.config.cjs --env development
 */

module.exports = {
  apps: [
    {
      // Application name and process
      name: 'pixology',
      script: './server.js',
      description: 'Pixology - Unified React Frontend + Express Backend',

      // Instance and execution settings
      instances: '1',  // Single instance for monolithic app
      exec_mode: 'fork',

      // Server port configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        VITE_API_URL: 'http://localhost:3000'
      },

      // Logging configuration
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,

      // Resource management
      max_memory_restart: '600M',  // Restart if exceeds 600MB
      autorestart: true,           // Auto-restart on crash
      max_restarts: 10,            // Max 10 restarts before stopping
      min_uptime: '10s',           // Min 10s uptime before restart counts

      // File watching
      watch: false,  // Don't watch files in production
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        '.git',
        'package-lock.json'
      ],

      // Health check and timeouts
      listen_timeout: 10000,  // 10s to start listening
      kill_timeout: 5000,     // 5s to gracefully shutdown
      wait_ready: true,       // Wait for app to signal ready

      // Environment-specific configurations
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // VITE_API_URL is read from .env.production during build
        // VITE_GOOGLE_CLIENT_ID is read from .env.production during build
      },

      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        VITE_API_URL: 'https://staging.pixology.ai'
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        VITE_API_URL: 'http://localhost:3000'
      }
    }
  ]
};
