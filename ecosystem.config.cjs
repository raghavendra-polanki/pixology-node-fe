module.exports = {
  apps: [
    {
      name: 'pixology-frontend',
      script: './server.js',
      instances: '1',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      merge_logs: true,
      // Health check configuration
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      // Environment-specific configs
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3002
      }
    }
  ]
};
