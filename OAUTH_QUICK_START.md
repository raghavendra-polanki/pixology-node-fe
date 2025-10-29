# Google OAuth Quick Start Guide

## What Was Implemented ✅

You now have a complete Google OAuth implementation with two storage strategies:

### Development Mode
- **Storage:** sessionStorage
- **Auto-clears:** When tab closes
- **Best for:** Testing, development

### Production Mode
- **Storage:** httpOnly Cookie (token) + sessionStorage (user data)
- **Auto-clears:** When browser closes
- **Best for:** Secure production deployment

---

## 5-Minute Setup

### 1️⃣ Get Google Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:3000/login`
   - `http://localhost:3000/home`
   - `https://pixology.ai` (your domain)

### 2️⃣ Create Environment Files

**Create `.env.local` (Development):**
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:3000
VITE_STORYLINE_URL=http://localhost:5173
PORT=3000
```

**Create `.env.production` (Production):**
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=https://api.pixology.ai
VITE_STORYLINE_URL=https://storyline.pixology.ai
PORT=3000
```

### 3️⃣ Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run backend
npm start
```

Visit: http://localhost:5173/login

---

## Complete User Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Google consent screen appears
   ↓
3. User consents
   ↓
4. LoginForm gets JWT token from Google
   ↓
5. authService sends token to backend
   ↓
6. Backend validates with Google
   ↓
7. Backend returns user data + token
   ↓
8. Token stored (sessionStorage or httpOnly cookie)
   ↓
9. User redirected to /home
   ↓
10. HomePage shows welcome message
    (Auto-redirects to storyline.pixology.ai in 3 seconds)
    ↓
11. User on storyline.pixology.ai with authenticated session
    (Login needed only once until browser/tab closes)
```

---

## File Changes Summary

### New Files Created
```
api/auth.js                              # Backend auth endpoints
src/shared/services/authService.ts       # Token management
src/shared/contexts/AuthContext.tsx      # Auth state
src/shared/components/ProtectedRoute.tsx # Route protection
src/pages/HomePage.tsx                   # Post-login page
.env.example                             # Config template
OAUTH_SETUP.md                           # Detailed guide
OAUTH_QUICK_START.md                     # This file
```

### Files Modified
```
server.js                        # Added auth routes
src/app/providers/index.tsx      # Added AuthProvider
src/app/router/AppRouter.tsx     # Added /home route + ProtectedRoute
src/features/login/components/LoginForm.tsx  # Added callback handling
package.json                     # Added google-auth-library
```

---

## Core Components

### AuthService (`src/shared/services/authService.ts`)
Handles token management and API calls
```typescript
const { loginWithGoogle, isAuthenticated, user } = authService;
await authService.loginWithGoogle(googleToken);
await authService.logout();
```

### AuthContext (`src/shared/contexts/AuthContext.tsx`)
Provides auth state to entire app
```typescript
const { user, isAuthenticated, loginWithGoogle, logout, error } = useAuth();
```

### ProtectedRoute (`src/shared/components/ProtectedRoute.tsx`)
Prevents unauthorized access to routes
```typescript
<ProtectedRoute redirectTo="/login">
  <HomePage />
</ProtectedRoute>
```

### HomePage (`src/pages/HomePage.tsx`)
- Shows welcome message with user info
- Auto-redirects to storyline.pixology.ai in 3 seconds
- Logout button available
- Storage mode indicator (dev/prod)

---

## API Endpoints

### Backend: POST /api/auth/google
```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"google_jwt_token"}'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  },
  "authToken": "...",
  "expiresIn": 3600
}
```

### Backend: GET /api/auth/verify
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/auth/verify
```

### Backend: POST /api/auth/logout
```bash
curl -X POST http://localhost:3000/api/auth/logout
```

---

## Storage Strategies Explained

### Development (sessionStorage)
✅ **Token Stored As:**
- `sessionStorage.authToken` - Raw JWT token
- `sessionStorage.authData` - User info + expiry

✅ **When Cleared:**
- Tab closes
- Browser closes
- Manual logout

✅ **Access:**
- JavaScript can read token
- Easier debugging

---

### Production (Hybrid)
✅ **Token Stored As:**
- `httpOnly Cookie: authToken` - Inaccessible to JS
- `sessionStorage.authUser` - User info only
- `sessionStorage.authExpiry` - Expiration time

✅ **When Cleared:**
- Browser closes (or cookie expiry)
- Manual logout

✅ **Security:**
- XSS protection (JS can't access token)
- CSRF protection (SameSite=Strict)
- HTTPS required for Secure flag

---

## Security Features

### Already Enabled
- ✅ XSS Protection (httpOnly cookies + CSP)
- ✅ CSRF Protection (SameSite=Strict)
- ✅ Auto-expiry (tokens expire after set time)
- ✅ Helmet.js security headers
- ✅ Compression enabled
- ✅ Static file caching

### Optional Enhancements
- Refresh token strategy (for long sessions)
- Database persistence (save user to DB)
- Email verification
- Two-factor authentication
- Rate limiting on auth endpoints

---

## Testing

### Local Development Test
```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Backend server
npm start
```
- Visit http://localhost:5173/login
- Click Google login
- Should see home page
- Check sessionStorage in DevTools

### Production Build Test
```bash
npm run build
npm start
```
- Visit http://localhost:3000/login
- Check Application > Cookies for `authToken` (httpOnly)
- Should auto-redirect after 3 seconds

---

## Troubleshooting

### Error: "Token verification failed"
```
✅ Check VITE_GOOGLE_CLIENT_ID is correct
✅ Verify Google Cloud credentials
✅ Ensure redirect URIs are in Google Console
```

### Not redirecting to /home
```
✅ Check browser console for errors
✅ Verify backend is running on PORT 3000
✅ Check VITE_API_URL in .env
```

### Session lost after refresh
```
This is normal for sessionStorage!
✅ In dev: Clear sessionStorage to test login again
✅ In prod: httpOnly cookie persists until browser closes
✅ Use localStorage if persistent login needed (less secure)
```

### CORS errors
```
✅ Ensure server.js is running
✅ Check credentials: 'include' in fetch calls
✅ Verify CORS headers in server
```

---

## Next Steps

1. **Add Google Client ID** → Update `.env.local`
2. **Test login flow** → Visit /login and authenticate
3. **Verify redirect** → Should land on storyline.pixology.ai
4. **Deploy to production** → Follow DEPLOYMENT.md
5. **Monitor sessions** → Check logs for auth events

---

## Key URLs & Routes

| Route | Purpose | Protected |
|-------|---------|-----------|
| `/` | Landing page | ❌ No |
| `/login` | Google OAuth login | ❌ No |
| `/home` | Post-login welcome | ✅ Yes |
| `/api/auth/google` | Backend validation | ✅ Token required |
| `/api/auth/verify` | Check auth status | ✅ Token required |
| `/api/auth/logout` | Clear session | ✅ Token required |

---

## Backend vs Frontend

### Backend (`server.js` + `api/auth.js`)
- Validates JWT tokens with Google
- Sets httpOnly cookies (production)
- Manages user sessions
- Provides secure endpoints

### Frontend (`authService.ts` + `AuthContext.tsx`)
- Handles Google login button
- Manages token storage
- Provides auth state to components
- Redirects after login

**They communicate via:**
- POST `/api/auth/google` - Validate token
- GET `/api/auth/verify` - Check session
- POST `/api/auth/logout` - Clear session

---

## Environment Variables Explained

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth credential |
| `VITE_API_URL` | `http://localhost:3000` | Backend URL |
| `VITE_STORYLINE_URL` | `https://storyline.pixology.ai` | Redirect after login |
| `PORT` | `3000` | Server port |

---

## Support

For detailed information, see:
- **Full Guide:** `OAUTH_SETUP.md`
- **Deployment:** `DEPLOYMENT.md`
- **Code:** Check individual files listed above

Good luck! 🚀
