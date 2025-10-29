# Google OAuth Setup Guide

This guide explains the Google OAuth implementation for Pixology, including token management, API configuration, and deployment instructions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GoogleLogin Component → Generates JWT Token                │
│  2. authService.loginWithGoogle(token) → Validates with Backend │
│  3. Storage Strategy:                                           │
│     - Dev: sessionStorage (both token + user)                  │
│     - Prod: httpOnly Cookie (token) + sessionStorage (user)    │
│  4. AuthContext → Provides user data to app                    │
│  5. ProtectedRoute → Redirects to /home                        │
│  6. HomePage → Auto-redirects to storyline.pixology.ai         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                    HTTP POST/GET with Auth
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    Server (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /api/auth/google → Verify JWT with Google             │
│  2. Extract user info (email, name, picture)                   │
│  3. Production: Set httpOnly Cookie (secure, httpOnly)         │
│  4. Return user data + token expiry                            │
│  5. GET /api/auth/verify → Verify token is still valid         │
│  6. POST /api/auth/logout → Clear session                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                      Verify with Google
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    Google OAuth Server                         │
├─────────────────────────────────────────────────────────────────┤
│  - Validates JWT token authenticity                            │
│  - Returns decoded token payload                               │
└─────────────────────────────────────────────────────────────────┘
```

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
4. Add authorized redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3000/login
   http://localhost:3000/home
   https://pixology.ai
   https://pixology.ai/login
   https://pixology.ai/home
   ```
5. Click "CREATE"
6. Copy the "Client ID" (you'll need this)

### 2. Environment Variables

#### Development Environment
Create a `.env.local` file in the project root:

```bash
# .env.local (for development)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
VITE_API_URL=http://localhost:3000
VITE_STORYLINE_URL=http://localhost:5173
PORT=3000
```

#### Production Environment
Create a `.env.production` file:

```bash
# .env.production
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://api.pixology.ai
VITE_STORYLINE_URL=https://storyline.pixology.ai
PORT=3000
NODE_ENV=production
```

### 3. Installation & Running

#### Development
```bash
# Install dependencies
npm install

# Install additional auth dependency
npm install google-auth-library

# Run development server
npm run dev

# In another terminal, run the backend
npm start
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

#### Production Build
```bash
# Build the application
npm run build

# Start production server
npm run serve
# or
npm start
```

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
│   │   │   └── ProtectedRoute.tsx       # Route protection
│   ├── features/
│   │   └── login/
│   │       └── components/
│   │           └── LoginForm.tsx        # Google login UI + callback
│   ├── pages/
│   │   ├── HomePage.tsx                 # Post-login page
│   │   └── NotFoundPage.tsx
│   ├── app/
│   │   ├── providers/
│   │   │   ├── index.tsx                # Updated with AuthProvider
│   │   │   ├── QueryProvider.tsx
│   │   │   └── UIProvider.tsx
│   │   ├── router/
│   │   │   └── AppRouter.tsx            # Updated with /home route
│   │   └── App.tsx
│   └── main.tsx
├── server.js                             # Express server with auth routes
├── .env.example                          # Environment variable template
├── .env.local                            # Development env vars (create this)
├── .env.production                       # Production env vars (create this)
├── OAUTH_SETUP.md                        # This file
├── DEPLOYMENT.md                         # Deployment guide
├── package.json                          # Updated with google-auth-library
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

// In AppRouter
<Route
  path="/home"
  element={
    <ProtectedRoute>
      <HomePage />
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
1. Start dev server: `npm run dev`
2. Start backend: `npm start`
3. Go to http://localhost:5173/login
4. Click "Sign in with Google"
5. Consent to permissions
6. Should redirect to http://localhost:3000/home
7. Should auto-redirect to storyline URL

### Test Production Flow
1. Build app: `npm run build`
2. Start server: `npm start`
3. Go to http://localhost:3000/login
4. Click "Sign in with Google"
5. Should redirect to /home
6. Should auto-redirect to storyline URL
7. Check browser cookies (httpOnly token should be set)

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
| **Frontend** | React with Google OAuth button |
| **Backend** | Express with token verification |
| **Dev Storage** | sessionStorage (simple) |
| **Prod Storage** | httpOnly Cookie + sessionStorage (secure) |
| **Sessions** | Auto-clear on tab/browser close |
| **Protection** | ProtectedRoute component for guarded routes |
| **Redirect** | Auto-redirect to storyline.pixology.ai |
| **Security** | XSS & CSRF protection enabled |

Everything is ready to use! Just add your Google Client ID and test the flow.
