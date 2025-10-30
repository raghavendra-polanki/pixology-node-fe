# Production Deployment Guide - Pixology

This guide covers deploying the **unified monolithic Pixology application** to production. The application includes:
- React frontend (Landing, Login, Storyline Dashboard)
- Express backend (OAuth, API endpoints)
- Single server serving everything on port 3000

---

## Architecture Overview

```
pixology.ai (Port 80/443 - Nginx)
    ↓
http://localhost:3000 (Express Server + React Frontend)
    ├── GET / → Landing page
    ├── GET /login → Login page
    ├── GET /home → Welcome page (protected)
    ├── GET /storyline → Dashboard (protected)
    └── POST /api/auth/* → OAuth endpoints
```

---

## Prerequisites

- Node.js 18+ installed
- npm installed
- Ubuntu/Debian server with SSH access
- Domain name configured (pixology.ai)
- Google OAuth credentials (Client ID)

---

## Step 1: Prepare Local Environment

Ensure you have the correct environment files locally:

### .env.local (Development)
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:3000
PORT=3000
```

### .env.production (Production)
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://pixology.ai
PORT=3000
NODE_ENV=production
```

Build locally to test:
```bash
npm install
npm run build
npm start
```

Visit http://localhost:3000 to verify everything works.

---

## Step 2: Deploy to Server

### Option A: Deploy via Git

**On your server:**

```bash
# 1. Clone the repository
cd /home/raghav
git clone <your-repository-url>
cd pixology-node-fe

# 2. Create .env.production with production values
cat > .env.production << 'EOF'
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://pixology.ai
PORT=3000
NODE_ENV=production
EOF

# 3. Verify ecosystem.config.cjs exists
ls -la ecosystem.config.cjs
# Should show the PM2 configuration file

# 4. Install dependencies
npm install

# 5. Build the application
npm run build

# 6. Verify dist folder is created
ls -la dist/
```

### Option B: Deploy via SCP

```bash
# From your local machine, copy files to server
scp -r dist/ server.js package.json .env.production ecosystem.config.cjs user@your-server:/home/raghav/pixology-node-fe/

# On server, install production dependencies
cd /home/raghav/pixology-node-fe
npm install --production

# Verify ecosystem config is present
ls -la ecosystem.config.cjs
```

---

## Step 3: Install PM2

PM2 manages the Node.js process and handles restarts, logs, and monitoring.

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 4: Start the Application with PM2

```bash
# Navigate to app directory
cd /home/raghav/pixology-node-fe

# Start the application using ecosystem config
pm2 start ecosystem.config.cjs --env production

# View status
pm2 status

# View logs
pm2 logs pixology-frontend
```

The `ecosystem.config.cjs` file includes:
- Automatic restart on crashes
- Memory limits (500MB auto-restart)
- Log rotation (error, output, combined logs)
- Health check configuration
- Environment-specific settings

### Ecosystem Config Details

```javascript
{
  name: 'pixology-frontend',        // Process name
  script: './server.js',              // Entry point
  instances: '1',                     // Number of instances
  exec_mode: 'fork',                  // Run mode
  max_memory_restart: '500M',         // Restart if exceeds 500MB
  error_file: './logs/err.log',       // Error log file
  out_file: './logs/out.log',         // Output log file
  log_file: './logs/combined.log',    // Combined logs
  autorestart: true,                  // Auto-restart on crash
  max_restarts: 10,                   // Max 10 restarts before stopping
  min_uptime: '10s',                  // Min uptime before restart counted
  watch: false,                       // Don't watch files (production)
  ignore_watch: ['node_modules', 'logs', 'dist']
}
```

---

## Step 5: Configure Auto-Start on Boot

```bash
# Generate startup script for your system
pm2 startup

# This outputs a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u raghav --hp /home/raghav

# Copy and run the command (with sudo)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u raghav --hp /home/raghav

# Save current PM2 processes and configuration
pm2 save

# Verify
pm2 list
pm2 show pixology-frontend
```

Now PM2 will automatically:
- Start your app on server reboot
- Restart it if it crashes
- Keep the ecosystem configuration intact

---

## Step 6: Configure Nginx as Reverse Proxy

Nginx will handle HTTPS and route requests to your Node.js server on port 3000.

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/pixology
```

Add this configuration:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name pixology.ai www.pixology.ai;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name pixology.ai www.pixology.ai;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/pixology.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pixology.ai/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-lived connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/pixology /etc/nginx/sites-enabled/

# Remove default site if needed
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 7: Set Up SSL with Let's Encrypt

Free HTTPS certificates via Let's Encrypt with automatic renewal.

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (will automatically configure Nginx)
sudo certbot --nginx -d pixology.ai -d www.pixology.ai

# Test auto-renewal
sudo certbot renew --dry-run

# Verify renewal service is running
sudo systemctl status certbot.timer
```

---

## Step 8: Configure Google OAuth for Production

Update your Google Cloud Console to allow pixology.ai:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click your **OAuth 2.0 Client ID**
4. Under **Authorized redirect URIs**, add:
   ```
   https://pixology.ai
   https://pixology.ai/login
   https://pixology.ai/home
   https://pixology.ai/storyline
   https://www.pixology.ai
   https://www.pixology.ai/login
   ```
5. **Save changes**

---

## Step 9: Configure Firewall

```bash
# Enable UFW (if not already enabled)
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# View status
sudo ufw status

# Optional: Limit SSH to prevent brute force
sudo ufw limit 22/tcp
```

---

## Post-Deployment Verification

### Test HTTP → HTTPS Redirect
```bash
curl -i http://pixology.ai
# Should return 301 redirect to https
```

### Test HTTPS Connection
```bash
curl https://pixology.ai
# Should return HTML of landing page
```

### Test API Endpoints
```bash
curl https://pixology.ai/api/auth/verify
# Should return auth status
```

### Test OAuth Flow
1. Visit https://pixology.ai
2. Click Login
3. Click "Sign in with Google"
4. Should show Google consent screen
5. Should redirect to /home after login
6. Should auto-redirect to /storyline

### Verify PM2 Status
```bash
pm2 status
pm2 logs pixology
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## PM2 Commands Reference

### Process Management
```bash
# Start with ecosystem config
pm2 start ecosystem.config.cjs --env production

# Stop
pm2 stop pixology-frontend

# Restart (downtime)
pm2 restart pixology-frontend

# Reload (zero-downtime restart)
pm2 reload pixology-frontend

# Delete from PM2
pm2 delete pixology-frontend
```

### Monitoring
```bash
# View status
pm2 status

# View real-time logs
pm2 logs pixology-frontend

# View logs with 100 lines
pm2 logs pixology-frontend --lines 100

# Monitor system resources (CPU, memory)
pm2 monit

# Show detailed info
pm2 show pixology-frontend
```

### Process List
```bash
# List all PM2 processes
pm2 list

# Show process details
pm2 show pixology-frontend

# Show ecosystem config
cat ecosystem.config.cjs
```

---

## Updating the Application

When you have new code to deploy:

```bash
# 1. SSH into your server
ssh user@pixology.ai

# 2. Navigate to app directory
cd /home/raghav/pixology-node-fe

# 3. Pull latest code (if using Git)
git pull origin main

# 4. Install dependencies (if needed)
npm install

# 5. Build the application
npm run build

# 6. Reload PM2 with ecosystem config (zero-downtime restart)
pm2 reload ecosystem.config.cjs --env production

# 7. Verify logs
pm2 logs pixology-frontend --lines 20
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs pixology-frontend --lines 50

# Check if port 3000 is in use
lsof -i :3000

# Kill process on port 3000 (if needed)
sudo fuser -k 3000/tcp

# Restart with ecosystem config
pm2 restart ecosystem.config.cjs --env production

# Or restart specific process
pm2 restart pixology-frontend
```

### Build Error: "Could not load AuthContext"

This happens when `.env.production` is missing. Make sure:
1. File exists: `ls -la .env.production`
2. Contains correct values: `cat .env.production`
3. Rebuild: `npm run build`

### High Memory Usage

The ecosystem config has memory limits configured (500MB auto-restart):

```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart pixology-frontend

# Check if there are multiple Node processes
ps aux | grep node

# Check ecosystem config memory limit
cat ecosystem.config.cjs | grep max_memory
```

### Cannot Access Website

1. Check if application is running: `pm2 status`
2. Check if Nginx is running: `sudo systemctl status nginx`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Check firewall: `sudo ufw status`
5. Test connection: `curl http://localhost:3000`

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# View renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### OAuth Login Not Working

1. Verify `.env.production` has correct `VITE_GOOGLE_CLIENT_ID`
   ```bash
   cat .env.production | grep VITE_GOOGLE_CLIENT_ID
   ```
2. Verify Google Cloud Console has correct redirect URIs
3. Verify `VITE_API_URL=https://pixology.ai`
4. Check browser console for errors: F12 → Console tab
5. Check server logs:
   ```bash
   pm2 logs pixology-frontend --lines 50
   ```
6. Verify the dist folder was built with correct env:
   ```bash
   grep -r "290720443235" dist/ | head -1
   ```

---

## Performance Optimization

### Enable Compression in Node

Already configured in server.js:
```javascript
app.use(compression());
```

### Static File Caching

Nginx is configured to cache static files for 1 year.

### Database Connection Pooling

(If you add a database later, use connection pools)

### Monitor Performance

```bash
pm2 monit
# Shows real-time CPU and memory usage
```

---

## Security Checklist

- [x] SSL/HTTPS enabled
- [x] Firewall configured
- [x] SSH key-based authentication
- [x] Node.js app running as non-root user
- [x] PM2 restart on crash enabled
- [x] Environment variables secured (.env.production not in git)
- [x] Google OAuth redirect URIs configured
- [x] CORS properly configured (no open CORS)
- [x] Security headers set in Nginx

### Additional Security

```bash
# Keep packages updated
npm audit
npm audit fix

# Check for vulnerabilities
npm audit --audit-level=moderate

# Update PM2
npm install -g pm2@latest
pm2 update
```

---

## Monitoring & Logs

### View Application Logs

```bash
# Last 100 lines
pm2 logs pixology-frontend --lines 100

# Real-time (streaming)
pm2 logs pixology-frontend

# Errors only
pm2 logs pixology-frontend --err

# View all logs (includes out, error, combined)
ls -la logs/
tail -f logs/err.log    # Error logs
tail -f logs/out.log    # Output logs
tail -f logs/combined.log  # Combined logs
```

### Setup Log Rotation

```bash
# Install log rotation module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Save configuration
pm2 save
```

### Monitor with PM2 Plus (Optional)

For advanced monitoring and alerting:

```bash
# Link to PM2 account (get keys from https://app.pm2.io)
pm2 link <secret_key> <public_key>
```

---

## Backup Strategy

### Backup Application

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/pixology"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup source code
tar -czf $BACKUP_DIR/pixology_$TIMESTAMP.tar.gz \
  /home/raghav/pixology-node-fe \
  --exclude=node_modules \
  --exclude=dist

echo "Backup created: $BACKUP_DIR/pixology_$TIMESTAMP.tar.gz"
EOF

chmod +x backup.sh
```

### Schedule Daily Backups

```bash
# Add to crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /home/raghav/backup.sh
```

---

## Production Checklist

Before going live:

- [x] `.env.production` created with correct values
- [x] `ecosystem.config.cjs` exists and configured
- [x] `npm run build` completes successfully
- [x] PM2 can start with ecosystem config: `pm2 start ecosystem.config.cjs --env production`
- [x] PM2 startup configured for auto-start: `pm2 startup` + `pm2 save`
- [x] Nginx installed and configured
- [x] SSL certificate obtained and configured
- [x] Google OAuth redirect URIs updated for pixology.ai
- [x] Firewall rules configured (ports 22, 80, 443)
- [x] Domain DNS pointing to server
- [x] HTTPS working (https://pixology.ai)
- [x] Login flow tested (Google OAuth)
- [x] Storyline dashboard accessible after login
- [x] PM2 logs being captured in logs/ directory
- [x] Nginx error logs checked
- [x] Memory limits configured (500MB auto-restart)

---

## Disaster Recovery

### Restore from Backup

```bash
# Stop the application
pm2 stop pixology

# Extract backup
cd /tmp
tar -xzf /backups/pixology/pixology_20251029_020000.tar.gz

# Copy back to production
sudo cp -r home/raghav/pixology-node-fe /home/raghav/

# Reinstall and rebuild
cd /home/raghav/pixology-node-fe
npm install
npm run build

# Restart
pm2 restart pixology
```

---

## Support & Resources

- **PM2 Docs:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **Google OAuth:** https://developers.google.com/identity
- **Node.js Best Practices:** https://nodejs.org/en/docs/guides/

---

## Contact & Troubleshooting

If you encounter issues:

1. **Check logs:** `pm2 logs pixology --lines 50`
2. **Check status:** `pm2 status`
3. **Test connection:** `curl http://localhost:3000`
4. **Check Nginx:** `sudo nginx -t` and `sudo systemctl status nginx`
5. **Check firewall:** `sudo ufw status`

---

**Pixology is now live in production!** 🚀

Visit: **https://pixology.ai**
