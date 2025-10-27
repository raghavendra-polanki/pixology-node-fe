# Pixology.ai - Frontend Application

**The Future of Athlete Marketing** - AI-powered digital avatars for NIL marketing.

---

## Quick Start

### Development Setup

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd pixology-node-fe

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Access at: **http://localhost:8080**

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint to check code quality |
| `npm run preview` | Preview production build locally |
| `npm run start` | Start production server |
| `npm run serve` | Build and start production server |

---

## Building for Production

### Step 1: Build the Application

```bash
npm run build
```

This creates optimized files in the `dist/` folder:
- Minified JavaScript and CSS
- Optimized images
- Production-ready assets

### Step 2: Test Locally

```bash
npm run start
```

Access at: **http://localhost:3000**

Test health check:
```bash
curl http://localhost:3000/health
```

---

## Deployment (PM2)

This application uses **PM2** for production deployment.

### Quick Deploy

```bash
# 1. Build
npm run build

# 2. Install PM2 globally
npm install -g pm2

# 3. Start with PM2
pm2 start ecosystem.config.cjs --env production

# 4. Enable auto-start on boot
pm2 startup
pm2 save
```

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs pixology-frontend

# Restart application
pm2 restart pixology-frontend

# Monitor
pm2 monit
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Project Structure

```
src/
├── app/                    # Application setup
│   ├── providers/          # React context providers
│   ├── router/             # Routes
│   └── App.tsx             # Root component
├── features/               # Feature modules
│   └── landing/            # Landing page
├── shared/                 # Shared resources
│   ├── components/         # Reusable components
│   │   ├── ui/            # UI components (shadcn/ui)
│   │   └── layout/        # Layout components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   └── constants/         # Constants
├── pages/                 # Page components
├── assets/                # Static assets
└── styles/                # Global styles
```

See [STRUCTURE.md](STRUCTURE.md) for detailed architecture.

---

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **TanStack Query** - Server state
- **Express** - Production server
- **PM2** - Process manager

---

## Environment Variables

Create a `.env` file:

```bash
PORT=3000
NODE_ENV=production
VITE_APP_NAME=Pixology.ai
VITE_API_URL=https://api.pixology.ai
```

**Note:** All Vite variables must be prefixed with `VITE_`

---

## Production Features

- ✅ **Security** - Helmet.js security headers
- ✅ **Performance** - Gzip compression, optimized caching
- ✅ **Reliability** - Health check endpoint, graceful shutdown
- ✅ **Monitoring** - PM2 process management
- ✅ **Auto-restart** - Crashes and server reboots

---

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[STRUCTURE.md](STRUCTURE.md)** - Project architecture
- **[.env.example](.env.example)** - Environment template

---

## Troubleshooting

### Build Fails
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Check Application Health
```bash
curl http://localhost:3000/health
```

---

## Support

- Check PM2 logs: `pm2 logs pixology-frontend`
- View application logs in real-time
- Test health endpoint: `/health`

---

**Ready to deploy? See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.** 🚀
