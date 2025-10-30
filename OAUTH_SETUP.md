# Google OAuth Setup Guide

This guide explains the Google OAuth implementation for Pixology, including token management, API configuration, and deployment instructions.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Unified Monolithic Application                   │
│                   (Single Repository & Single Server)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Client (Browser)                             │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  1. GoogleLogin Component → Generates JWT Token              │ │
│  │  2. authService.loginWithGoogle(token) → Backend Validation  │ │
│  │  3. Storage Strategy:                                        │ │
│  │     - Dev: sessionStorage (both token + user)               │ │
│  │     - Prod: httpOnly Cookie (token) + sessionStorage (user) │ │
│  │  4. AuthContext → Provides user data to all features       │ │
│  │  5. ProtectedRoute → Routes: /home, /storyline             │ │
│  │  6. HomePage → Auto-redirects to /storyline (internal)     │ │
│  │  7. StorylinePage → Dashboard with user info               │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                            ↓ ↑                                       │
│                  HTTP POST/GET with Auth                            │
│                            ↓ ↑                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Backend (Express - Same Server)                   │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  1. POST /api/auth/google → Verify JWT with Google           │ │
│  │  2. Extract user info (email, name, picture)                 │ │
│  │  3. Production: Set httpOnly Cookie (secure, httpOnly)       │ │
│  │  4. Return user data + token expiry                          │ │
│  │  5. GET /api/auth/verify → Verify token is still valid       │ │
│  │  6. POST /api/auth/logout → Clear session                    │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                      Verify with Google
                              ↓ ↑
┌──────────────────────────────────────────────────────────────────────┐
│                    Google OAuth Server                              │
├──────────────────────────────────────────────────────────────────────┤
│  - Validates JWT token authenticity                                 │
│  - Returns decoded token payload                                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Change:** Pixology is now a **unified monolithic application** with:
- Single repository (pixology-node-fe)
- Single backend server (Express)
- Single frontend app (React with multiple features)
- All routes internal (no external redirects)

---

## Token Storage Strategy

### Development Mode
- **Storage Location:** `sessionStorage`
- **Token Access:** JavaScript can access the token
- **Session Duration:** Cleared when tab closes
- **Security Level:** Good (XSS protection via auto-expiry)
- **UX:** Better (user doesn't need to re-login per tab)

```javascript
// Development storage
sessionStorage.setItem('authToken', googleToken);
sessionStorage.setItem('authData', JSON.stringify({ user, expiresAt }));
```

### Production Mode
- **Storage Location:** httpOnly Cookie + sessionStorage
- **Token Access:** Inaccessible to JavaScript (browser only)
- **Session Duration:** Configurable via backend
- **Security Level:** Excellent (XSS protection)
- **UX:** Good (token persists, but user data cleared on tab close)

```javascript
// Production storage
// Token: Set by backend via httpOnly cookie (inaccessible to JS)
// res.cookie('authToken', token, {
//   httpOnly: true,
//   secure: true,
//   sameSite: 'strict'
// });

sessionStorage.setItem('authUser', JSON.stringify(user));
sessionStorage.setItem('authExpiry', expiresAt);
```

---

## Setup Instructions

### 1. Google Cloud Configuration

#### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown
3. Click "NEW PROJECT"
4. Enter "Pixology" as project name
5. Click "CREATE"

#### Step 2: Enable Google+ API
1. In the Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click it and press "ENABLE"

#### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "CREATE CREDENTIALS" > "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized redirect URIs (all requests go to same domain):
   ```
   http://localhost:3000
   http://localhost:8080
   https://pixology.ai
   ```
5. Click "CREATE"
6. Copy the "Client ID" (you'll need this)

**Note:** Since Storyline is now integrated internally, all routes are served from the same domain. Just add your main domain/localhost URLs.

### 2. Environment Variables

#### Development Environment
Create a `.env.local` file in the project root:

```bash
# .env.local (for development)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
VITE_API_URL=http://localhost:3000
PORT=3000
```

#### Production Environment
Create a `.env.production` file:

```bash
# .env.production
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://api.pixology.ai
PORT=3000
NODE_ENV=production
```

**Note:** `VITE_STORYLINE_URL` is no longer needed since Storyline is now an internal route (`/storyline`) instead of external.

### 3. Installation & Running

#### Development
```bash
# Install dependencies
npm install

# Run unified dev server (frontend + backend)
npm run dev
```

The app will be available at:
- **Frontend + Backend:** http://localhost:8080
- **Backend API:** http://localhost:3000

Both run on the same server with no CORS issues!

#### Production Build
```bash
# Build the application
npm run build

# Start production server (serves built frontend + backend API)
npm start
```

The app will be available at:
- **http://localhost:3000**

---

## File Structure

```
pixology-node-fe/
├── api/
│   └── auth.js                          # Backend auth endpoints
├── src/
│   ├── shared/
│   │   ├── services/
│   │   │   └── authService.ts          # Auth logic (token management)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx          # Auth state management
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx       # Route protection
│   │   │   └── ui/                      # UI components
│   ├── features/
│   │   ├── landing/                     # Landing page feature
│   │   ├── login/
│   │   │   └── components/
│   │   │       └── LoginForm.tsx        # Google login UI + callback
│   │   ├── storyline/                   # Storyline dashboard (CONSOLIDATED)
│   │   │   ├── components/
│   │   │   │   └── StorylineDashboard.tsx
│   │   │   ├── pages/
│   │   │   │   └── StorylinePage.tsx
│   │   │   └── index.tsx
│   ├── pages/
│   │   ├── HomePage.tsx                 # Post-login welcome page
│   │   └── NotFoundPage.tsx
│   ├── app/
│   │   ├── providers/
│   │   │   └── index.tsx                # Global providers (includes AuthProvider)
│   │   ├── router/
│   │   │   └── AppRouter.tsx            # All routes: /, /login, /home, /storyline, /404
│   │   └── App.tsx
│   └── main.tsx
├── server.js                             # Express server (frontend + backend)
├── .env.local                            # Development env vars (create this)
├── .env.production                       # Production env vars (create this)
├── OAUTH_SETUP.md                        # This file
├── CONSOLIDATED_SETUP.md                 # Architecture & consolidation guide
├── DEPLOYMENT.md                         # Deployment guide
├── package.json                          # Single package.json with all dependencies
└── vite.config.ts
```

---

## API Endpoints

### POST /api/auth/google
**Verify Google token and create session**

**Request:**
```json
{
  "token": "google_jwt_token_from_client"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "google_user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/..."
  },
  "authToken": "verified_token",
  "expiresIn": 3600
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Token verification failed"
}
```

**Headers (Production):**
```
Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

---

### GET /api/auth/verify
**Verify if user token is still valid**

**Request Headers:**
```
Authorization: Bearer <token>  # (Dev only, prod uses cookie)
Cookie: authToken=<token>      # (Prod only)
```

**Response (Valid):**
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "google_user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "authenticated": false,
  "error": "Invalid or expired token"
}
```

---

### POST /api/auth/logout
**Clear user session**

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Headers (Production):**
```
Set-Cookie: authToken=; Max-Age=0
```

---

## Usage in Components

### Check Authentication Status
```tsx
import { useAuth } from '@/shared/contexts/AuthContext';

export const MyComponent = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
};
```

### Protected Routes
```tsx
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { StorylinePage } from '@/features/storyline';

// In AppRouter
<Route
  path="/home"
  element={
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/storyline"
  element={
    <ProtectedRoute>
      <StorylinePage />
    </ProtectedRoute>
  }
/>
```

### Logout
```tsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // User is redirected to /login by router
};
```

---

## Security Best Practices

### For Development
- ✅ Use sessionStorage for easy testing
- ✅ Tokens auto-clear when tab closes
- ✅ XSS protection via auto-expiry

### For Production
- ✅ Use httpOnly cookies (immune to XSS)
- ✅ Set `Secure` flag (HTTPS only)
- ✅ Set `SameSite=Strict` (CSRF protection)
- ✅ Keep token expiry short (30-60 minutes)
- ✅ Implement refresh token strategy for long sessions

### CSRF Protection
Currently implemented via:
- `SameSite=Strict` cookie flag
- CORS configuration (restrict to trusted domains)

Optional: Add CSRF tokens for additional protection
```javascript
// In backend
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
```

### XSS Protection
- ✅ httpOnly cookies prevent JavaScript access
- ✅ React auto-escapes rendered content
- ✅ Implement Content Security Policy (CSP)

```javascript
// Already in server.js
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      // ... other directives
    },
  },
});
```

---

## Troubleshooting

### "Token verification failed"
**Cause:** Invalid Google Client ID or token expired
**Solution:**
1. Verify VITE_GOOGLE_CLIENT_ID in .env
2. Check Google Cloud Console credentials
3. Ensure redirect URIs are configured

### "Redirect to accounts.google.com"
**Cause:** Missing token handling in LoginForm
**Solution:** Already fixed in updated LoginForm.tsx

### User logged out after page refresh
**Cause:** Using sessionStorage + page refresh clears it
**Solution:** Switch to production mode or use localStorage (less secure)

### "CORS error" when calling /api/auth/google
**Cause:** Backend credentials not configured
**Solution:** Ensure `credentials: 'include'` in fetch calls

### httpOnly cookie not being set
**Cause:** HTTPS required for `Secure` flag in production
**Solution:**
- In development: `secure: false` allowed
- In production: Enable HTTPS

---

## Switching Between Development and Production Modes

The app automatically switches based on `import.meta.env.MODE`:

**Development:**
```bash
npm run dev  # MODE = 'development'
```

**Production:**
```bash
npm run build  # MODE = 'production'
npm start
```

The `authService.ts` file checks the mode and uses appropriate storage:
```typescript
this.isProduction = import.meta.env.MODE === 'production';
```

---

## Testing

### Test Development Flow
1. Start unified dev server: `npm run dev`
2. Go to http://localhost:8080
3. Click "Login" → redirects to `/login`
4. Click "Sign in with Google"
5. Consent to permissions
6. Should redirect to `/home` (welcome page)
7. Should auto-redirect to `/storyline` (dashboard)
8. See welcome message with user info

### Test Production Flow
1. Build app: `npm run build`
2. Start server: `npm start`
3. Go to http://localhost:3000
4. Click "Login" → redirects to `/login`
5. Click "Sign in with Google"
6. Consent to permissions
7. Should redirect to `/home`
8. Should auto-redirect to `/storyline`
9. Check browser cookies (httpOnly token should be set in production)

---

## Next Steps

1. ✅ Get Google Client ID from Google Cloud Console
2. ✅ Create `.env.local` and `.env.production`
3. ✅ Test login flow in development
4. ✅ Deploy to production
5. ⭕ **Optional:** Implement refresh token strategy
6. ⭕ **Optional:** Add database persistence for user data
7. ⭕ **Optional:** Add email verification flow

---

## Support & Resources

- [Google OAuth Documentation](https://developers.google.com/identity)
- [JWT Tokens](https://jwt.io/)
- [httpOnly Cookies](https://owasp.org/www-community/HttpOnly)
- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)

---

## Summary

Your Google OAuth implementation includes:

| Aspect | Details |
|--------|---------|
| **Architecture** | Unified monolithic (single repo, single server) |
| **Frontend** | React with Google OAuth button + multiple features |
| **Backend** | Express with token verification (same server) |
| **Dev Environment** | Frontend on :8080, Backend on :3000 (same machine, no CORS) |
| **Prod Environment** | Everything on :3000 (single server) |
| **Dev Storage** | sessionStorage (simple) |
| **Prod Storage** | httpOnly Cookie + sessionStorage (secure) |
| **Sessions** | Auto-clear on tab/browser close |
| **Protection** | ProtectedRoute component for guarded routes |
| **Routing** | Internal routes: /, /login, /home, /storyline, /404 |
| **Security** | XSS & CSRF protection enabled |

Everything is ready to use! Just add your Google Client ID and test the flow.

**For more details on the consolidated architecture, see:** `CONSOLIDATED_SETUP.md`
