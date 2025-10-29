# Pixology Consolidated Setup Guide

The Pixology platform is now a **single unified monolithic application** with clear feature separation.

---

## 📁 Project Structure

```
pixology-node-fe/
├── src/
│   ├── features/
│   │   ├── landing/              # Landing page feature
│   │   │   └── ...
│   │   ├── login/                # Google OAuth login feature
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── pages/
│   │   │   │   └── LoginPage.tsx
│   │   │   └── index.tsx
│   │   │
│   │   └── storyline/           # Storyline dashboard feature (NEW)
│   │       ├── components/
│   │       │   └── StorylineDashboard.tsx
│   │       ├── pages/
│   │       │   └── StorylinePage.tsx
│   │       └── index.tsx
│   │
│   ├── shared/
│   │   ├── services/
│   │   │   └── authService.ts   # Shared auth logic
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Shared auth context
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ui/
│   │   ├── types/
│   │   ├── constants/
│   │   └── hooks/
│   │
│   ├── pages/
│   │   ├── HomePage.tsx         # Home page (pre-storyline)
│   │   └── NotFoundPage.tsx
│   │
│   ├── app/
│   │   ├── providers/
│   │   │   └── index.tsx        # Global providers (includes AuthProvider)
│   │   ├── router/
│   │   │   └── AppRouter.tsx    # All routes defined here
│   │   ├── App.tsx
│   │   └── ...
│   │
│   └── main.tsx                 # React entry point
│
├── api/
│   └── auth.js                  # Backend auth endpoints
│
├── server.js                    # Express server (serves everything)
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS
├── package.json                 # All dependencies here
├── .env.local                   # Local configuration
└── ...
```

---

## 🎯 Application Routes

| Route | Purpose | Protected | Component |
|-------|---------|-----------|-----------|
| `/` | Landing page | ❌ No | `LandingPage` |
| `/login` | Google OAuth login | ❌ No | `LoginPage` |
| `/home` | Pre-Storyline welcome | ✅ Yes | `HomePage` |
| `/storyline` | Main dashboard | ✅ Yes | `StorylinePage` |
| `/404` | Not found | ❌ No | `NotFoundPage` |

---

## 🔐 Authentication Flow

```
1. User visits / (Landing)
   ↓
2. Clicks login → /login
   ↓
3. Google OAuth authentication
   ↓
4. Token validated by backend
   ↓
5. Stored in localStorage/sessionStorage
   ↓
6. Redirect to /home
   ↓
7. HomePage shows welcome (3 sec auto-redirect)
   ↓
8. Navigate to /storyline
   ↓
9. StorylineDashboard loads (uses useAuth context)
```

---

## 🚀 Running the Application

### Single Development Server

```bash
cd pixology-node-fe

# Install dependencies
npm install

# Development mode
npm run dev
```

Runs on **http://localhost:8080**

Both frontend AND backend run from the same server:
- Frontend: Vite dev server (port 8080)
- Backend API: Express on port 3000
- Both are on same machine, so no CORS issues!

### Backend Only (if needed)

```bash
npm start
```

Runs on **http://localhost:3000** serving the built frontend.

### Production Build

```bash
npm run build
npm start
```

---

## ✅ Key Benefits of Consolidation

### ✅ Single Repository
- Easier to manage
- Single git history
- Unified CI/CD

### ✅ Shared Code
- Auth logic not duplicated
- Types shared between features
- Utilities centralized
- Styling consistent

### ✅ Simple Development
- One `npm install`
- One `npm run dev`
- No port conflicts
- Easier debugging
- Faster development cycle

### ✅ No CORS Issues
- Both features on same origin
- Token sharing works seamlessly
- sessionStorage/localStorage work across routes

### ✅ Easy Deployment
- Single build
- Single server
- Single environment file
- Simpler DevOps

### ✅ Easy to Scale Later
- Can extract Storyline to separate repo when needed
- No code changes required, just restructure
- All shared code in `src/shared/`

---

## 📦 Dependencies

All dependencies are in a **single package.json**:

```json
{
  "dependencies": {
    "express": "^4.21.2",
    "helmet": "^8.1.0",
    "compression": "^1.8.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@react-oauth/google": "^0.12.2",
    "lucide-react": "^0.462.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

No duplicate packages, no version conflicts!

---

## 🔧 Configuration

### Development (.env.local)
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:3000
PORT=3000
```

### Production (.env.production)
```bash
VITE_GOOGLE_CLIENT_ID=your_prod_google_client_id
VITE_API_URL=https://api.pixology.ai
PORT=3000
```

---

## 📊 File Summary

| Location | Purpose | Type |
|----------|---------|------|
| `src/features/login/` | Google OAuth login | Feature |
| `src/features/storyline/` | Dashboard | Feature |
| `src/features/landing/` | Landing page | Feature |
| `src/shared/` | Reusable code | Shared |
| `api/auth.js` | OAuth endpoints | Backend |
| `server.js` | Express server | Backend |

---

## 🧪 Testing the Complete Flow

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Visit landing page:**
   ```
   http://localhost:8080
   ```

3. **Click "Login"** → redirects to `/login`

4. **Click "Sign in with Google"**

5. **Authorize** in Google consent screen

6. **See welcome page** at `/home`

7. **Wait 3 seconds** (or click button) → redirects to `/storyline`

8. **See Storyline dashboard** with your profile info

9. **Click "Logout"** → redirects to `/login`

---

## 🎨 Customization

### Add New Feature
1. Create `src/features/myfeature/`
2. Add components, pages, hooks, types
3. Create `src/features/myfeature/index.tsx` with exports
4. Add route in `src/app/router/AppRouter.tsx`
5. Use `<ProtectedRoute>` for auth-required features

### Modify Styling
- **Colors:** `tailwind.config.js`
- **Global styles:** `src/index.css` (main app)
- **Component styles:** Inline Tailwind classes

### Add API Endpoints
- Backend: `api/auth.js` (or create new file)
- Mount in: `server.js` with `app.use('/api/...', router)`

---

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

Creates optimized build in `dist/` folder.

### Run on Server
```bash
npm install --production
npm start
```

Serves on **http://localhost:3000**

### With PM2
```bash
pm2 start server.js --name pixology
pm2 save
pm2 startup
```

See `DEPLOYMENT.md` for details.

---

## 📚 Documentation

- **OAuth Setup:** `OAUTH_SETUP.md`
- **OAuth Quick Ref:** `OAUTH_QUICK_START.md`
- **Deployment:** `DEPLOYMENT.md`
- **Integration:** `../INTEGRATION_GUIDE.md`
- **Quick Start:** `../QUICK_START.md`

---

## 🧹 Cleanup (Optional)

The `pixology-node-storyline/` folder is now integrated and can be deleted:

```bash
rm -rf /path/to/pixology-node-storyline
```

All its code is now in:
```
pixology-node-fe/src/features/storyline/
```

---

## ✨ What Changed

### Before (Separate Repos)
```
pixology-node-fe/
pixology-node-storyline/  ← Separate repo
  - Duplicate dependencies
  - Different .env files
  - Separate deployments
  - CORS configuration needed
  - sessionStorage isolation issues
```

### After (Consolidated)
```
pixology-node-fe/
├── features/login/
├── features/storyline/  ← Same repo!
├── shared/              ← Shared code
└── server.js            ← Single backend
  - Single deployment
  - Shared dependencies
  - No CORS issues
  - Single .env file
  - Simpler development
```

---

## 🎯 When to Split Again

You might consider separating later when:

- ✅ Team grows to 5+ developers
- ✅ Different deployment needs
- ✅ Heavy scaling required (separate scaling strategies)
- ✅ Different tech stacks needed
- ✅ Storyline becomes 10,000+ lines of code

**You can split cleanly at any time** because:
- Shared code is in `src/shared/`
- Features are isolated in `src/features/`
- No cross-imports between features
- Easy to extract to separate repo

---

## 📋 Checklist

- ✅ Storyline integrated into pixology-node-fe
- ✅ Routes updated in AppRouter
- ✅ HomePage redirects to /storyline (internal route)
- ✅ Single package.json with all dependencies
- ✅ Build tested and working
- ✅ No CORS issues
- ✅ Auth context shared between features
- ✅ Single server.js for backend

---

## 🎉 Done!

Your Pixology platform is now a **clean, unified monolithic application** with:

- Clear feature separation
- Shared utilities and auth
- Single development workflow
- Easy maintenance
- Simple deployment
- Ready to scale when needed

**Start development with:**
```bash
npm run dev
```

Visit: **http://localhost:8080**

Enjoy! 🚀
