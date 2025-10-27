# Deployment Guide

This application uses **PM2** for production deployment. PM2 is a production process manager that provides:
- Automatic restarts on crashes
- Load balancing across CPU cores
- Log management
- Zero-downtime reloads
- Auto-start on system boot

---

## Prerequisites

- Node.js 18+ installed
- npm installed
- Server with SSH access (VPS, cloud instance, etc.)

---

## Step 1: Prepare the Application

On your local machine:

```bash
# Install dependencies
npm install

# Build the application
npm run build
```

This creates optimized production files in the `dist/` folder.

---

## Step 2: Deploy to Server

### Option A: Upload via Git

```bash
# On your server
git clone <your-repository-url>
cd pixology-node-fe
npm install
npm run build
```

### Option B: Upload via SCP/SFTP

```bash
# From your local machine
scp -r dist/ package.json server.js ecosystem.config.cjs user@your-server:/path/to/app/
```

Then on your server:
```bash
cd /path/to/app
npm install --production
```

---

## Step 3: Install PM2

On your server:

```bash
npm install -g pm2
```

---

## Step 4: Start the Application

```bash
# Start with PM2
pm2 start ecosystem.config.cjs --env production

# View status
pm2 status

# View logs
pm2 logs pixology-frontend
```

---

## Step 5: Enable Auto-Start on Boot

```bash
# Generate startup script
pm2 startup

# This will output a command - copy and run it (with sudo)
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser

# Save current PM2 processes
pm2 save
```

Now PM2 will automatically start your application when the server reboots.

---

## PM2 Commands Reference

### Managing the Application

```bash
# Start
pm2 start ecosystem.config.cjs --env production

# Stop
pm2 stop pixology-frontend

# Restart
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

# View logs (real-time)
pm2 logs pixology-frontend

# View last 100 log lines
pm2 logs pixology-frontend --lines 100

# Monitor CPU and memory
pm2 monit
```

### Information

```bash
# Detailed info
pm2 show pixology-frontend

# List all processes
pm2 list
```

---

## Environment Variables

Create a `.env` file in your application directory:

```bash
# Server configuration
PORT=3000
NODE_ENV=production

# Application variables (optional)
VITE_APP_NAME=Pixology.ai
VITE_API_URL=https://api.pixology.ai
```

Then restart the application:
```bash
pm2 restart pixology-frontend
```

---

## Setting Up Nginx (Reverse Proxy)

For production, use Nginx as a reverse proxy:

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx

Create a configuration file:

```bash
sudo nano /etc/nginx/sites-available/pixology
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pixology /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Setting Up SSL (HTTPS)

Use Let's Encrypt for free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx for HTTPS
- Set up automatic renewal

---

## Updating the Application

When you have new code to deploy:

```bash
# 1. Pull latest code (if using Git)
git pull

# 2. Install new dependencies (if any)
npm install

# 3. Build the application
npm run build

# 4. Reload PM2 (zero-downtime)
pm2 reload pixology-frontend
```

---

## Health Check

Test if your application is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-27T12:00:00.000Z"}
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs pixology-frontend --lines 50

# Check if port is in use
lsof -i :3000

# Restart PM2
pm2 restart pixology-frontend
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart pixology-frontend
```

### Cannot Access from Browser

1. Check if application is running: `pm2 status`
2. Check if port 3000 is accessible: `curl http://localhost:3000/health`
3. Check Nginx status: `sudo systemctl status nginx`
4. Check firewall: `sudo ufw status`
5. Ensure port 80/443 is open: `sudo ufw allow 80` and `sudo ufw allow 443`

---

## Log Management

PM2 logs can grow large over time. Configure log rotation:

```bash
pm2 install pm2-logrotate

# Configure rotation (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

This rotates logs when they exceed 10MB and keeps 7 days of logs.

---

## Monitoring (Optional)

For advanced monitoring, use PM2 Plus (optional):

```bash
pm2 link <secret_key> <public_key>
```

Get your keys from: https://app.pm2.io

---

## Production Checklist

Before going live:

- [ ] Application builds successfully (`npm run build`)
- [ ] PM2 starts the application (`pm2 start ecosystem.config.cjs`)
- [ ] Auto-start configured (`pm2 startup` and `pm2 save`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Health check working (`/health` endpoint)
- [ ] Environment variables set
- [ ] Firewall configured
- [ ] Logs are being captured

---

## Security Recommendations

1. **Keep packages updated**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Use strong firewall rules**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

3. **Disable root login** - Edit `/etc/ssh/sshd_config`

4. **Regular backups** - Backup your application and database

5. **Monitor logs regularly** - Check for errors and security issues

---

## Support

For issues or questions:
- Check PM2 logs: `pm2 logs pixology-frontend`
- Check server logs: `/var/log/nginx/error.log`
- Test health endpoint: `curl http://localhost:3000/health`

---

**Your application is now deployed and running in production!** 🚀
