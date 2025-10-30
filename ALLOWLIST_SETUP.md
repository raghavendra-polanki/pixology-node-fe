# Allowlist Setup Guide

This guide explains how to set up and manage the allowlist feature for Pixology, which restricts access to approved users only.

---

## Overview

The allowlist feature provides:
- ✅ Role-based access control
- ✅ Admin API to manage approved users
- ✅ Automatic check on Google OAuth login
- ✅ User-friendly error messages
- ✅ Bulk user import support

---

## How It Works

```
User logs in with Google
         ↓
Backend verifies Google token
         ↓
Backend checks Firestore allowlist
         ↓
    ┌─────────────────┐
    │                 │
 YES (approved)    NO (not approved)
    │                 │
  Login Success    Error: "Access denied"
    │                 │
  Save user        Show error message
    │                 │
  Redirect home    Redirect to login
```

---

## Setup Instructions

### 1. Environment Variables

Add to `.env.local` and `.env.production`:

```bash
# Admin API key for managing allowlist
# Generate a strong random key: openssl rand -base64 32
ADMIN_API_KEY=your-super-secret-admin-key-here
```

### 2. Database Schema

The allowlist is stored in a Firestore collection:

**Collection:** `allowlist`
**Document ID:** User email (used as primary key)

```javascript
{
  email: "user@example.com",
  allowed: true,
  name: "User Name", (optional)
  department: "Sales", (optional)
  addedAt: 2024-10-30T10:15:30.000Z
}
```

---

## Admin API Endpoints

All endpoints require the `X-Admin-Key` header with your admin API key.

### 1. Get All Allowlist Users

**GET** `/api/allowlist`

```bash
curl -X GET http://localhost:3000/api/allowlist \
  -H "X-Admin-Key: your-admin-key"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "allowlist": [
    {
      "email": "user1@example.com",
      "allowed": true,
      "name": "User One",
      "department": "Sales",
      "addedAt": "2024-10-30T10:15:30.000Z"
    },
    {
      "email": "user2@example.com",
      "allowed": true,
      "addedAt": "2024-10-29T09:00:00.000Z"
    }
  ]
}
```

### 2. Add Single User

**POST** `/api/allowlist/add`

```bash
curl -X POST http://localhost:3000/api/allowlist/add \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "department": "Marketing"
  }'
```

**Request Body:**
```json
{
  "email": "newuser@example.com",    // Required
  "name": "User Full Name",           // Optional
  "department": "Marketing"           // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User newuser@example.com added to allowlist",
  "email": "newuser@example.com"
}
```

### 3. Bulk Add Users

**POST** `/api/allowlist/bulk-add`

```bash
curl -X POST http://localhost:3000/api/allowlist/bulk-add \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com"
    ]
  }'
```

**Request Body:**
```json
{
  "emails": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added 3 users to allowlist",
  "count": 3
}
```

### 4. Remove User

**DELETE** `/api/allowlist/:email`

```bash
curl -X DELETE http://localhost:3000/api/allowlist/user@example.com \
  -H "X-Admin-Key: your-admin-key"
```

**Response:**
```json
{
  "success": true,
  "message": "User user@example.com removed from allowlist",
  "email": "user@example.com"
}
```

---

## Using Admin Endpoints

### Generate Admin Key

Generate a secure random key:

```bash
# macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Save Admin Key

Add the generated key to your environment:

```bash
# .env.production
ADMIN_API_KEY=your-generated-key-here
```

### Import Users from CSV

Create a script to bulk import users:

```bash
#!/bin/bash

ADMIN_KEY="your-admin-key"
API_URL="http://localhost:3000/api/allowlist/bulk-add"
CSV_FILE="users.csv"

# Extract emails from CSV (assumes email in first column)
EMAILS=$(awk -F',' 'NR>1 {print "\"" $1 "\""}' "$CSV_FILE" | paste -sd ',' -)

# Convert to JSON array
JSON_EMAILS="[${EMAILS}]"

echo "Importing users..."
curl -X POST "$API_URL" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"emails\": $JSON_EMAILS}"

echo "Import complete!"
```

---

## User Experience

### For Allowed Users

1. User clicks "Sign in with Google"
2. Selects their Google account
3. Backend verifies they're in allowlist
4. User logs in successfully
5. Redirected to `/home` → `/storyline`

### For Non-Allowed Users

1. User clicks "Sign in with Google"
2. Selects their Google account
3. Backend checks allowlist
4. User sees error message:
   > "Access denied. Your email is not authorized to access Pixology. Please contact support."
5. User is redirected back to login screen
6. Error persists until they're added to allowlist

---

## Security Best Practices

### 1. Protect Admin Key

- ✅ Use strong, randomly generated keys
- ✅ Store in environment variables only
- ✅ Never commit to version control
- ✅ Rotate regularly
- ✅ Use different keys for dev/staging/production

### 2. Firestore Security Rules

Set rules to prevent unauthorized access:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow backend to read allowlist
    // Clients should never have direct access
    match /allowlist/{email} {
      allow read, write: if false;
    }

    // Users can only read their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### 3. Rate Limiting

To prevent brute force attacks, implement rate limiting:

```javascript
// In server.js
import rateLimit from 'express-rate-limit';

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/allowlist', adminLimiter);
```

---

## Common Use Cases

### Use Case 1: Beta Testing

Allow only internal team members:

```bash
curl -X POST http://localhost:3000/api/allowlist/bulk-add \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      "team@company.com",
      "qa@company.com",
      "product@company.com"
    ]
  }'
```

### Use Case 2: Customer Onboarding

Add customers after they sign the contract:

```javascript
// When customer signs up in your dashboard
async function activateCustomer(email, customerName) {
  const response = await fetch('/api/allowlist/add', {
    method: 'POST',
    headers: {
      'X-Admin-Key': process.env.ADMIN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      name: customerName,
      department: 'Customer',
    }),
  });
  return response.json();
}
```

### Use Case 3: Department-Based Access

Track departments and manage access by department:

```bash
# Add entire department
curl -X POST http://localhost:3000/api/allowlist/bulk-add \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      "sales1@company.com",
      "sales2@company.com",
      "sales3@company.com"
    ]
  }'
```

---

## Troubleshooting

### Error: "Unauthorized. Invalid admin key."

- Verify the `ADMIN_API_KEY` environment variable is set
- Check the header is spelled correctly: `X-Admin-Key`
- Ensure the key matches exactly (no extra spaces)

### Error: "Invalid email format"

- Check the email addresses are valid (user@domain.com)
- Remove any whitespace from email addresses
- Verify all emails in bulk operations are valid

### Error: "Email is required"

- Ensure the `email` field is in the request body
- Check for typos in field name (must be `email`, not `email_address`)

### User can still login after removal

- Firestore has eventual consistency
- Changes may take a few seconds to propagate
- Clear browser cache and try again
- Check the allowlist has actually been updated

---

## Migration from Existing Auth

If you have existing users who should automatically be approved:

```javascript
// api/migrations/migrateLegacyUsers.js
import { bulkAddToAllowlist } from '../utils/firestoreUtils.js';

async function migrateExistingUsers() {
  const legacyUsers = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
  ];

  await bulkAddToAllowlist(legacyUsers);
  console.log(`Migrated ${legacyUsers.length} users`);
}

// Run once
migrateExistingUsers().catch(console.error);
```

---

## Removing Allowlist Requirement

If you want to disable the allowlist check later:

In `api/auth.js`, comment out or remove this section:

```javascript
// Check if user is in the allowlist
// const allowed = await isUserAllowed(email);
// if (!allowed) {
//   return res.status(403).json({ ... });
// }
```

---

## Testing

### Test Allowed User

1. Add your email to allowlist:
   ```bash
   curl -X POST http://localhost:3000/api/allowlist/add \
     -H "X-Admin-Key: your-admin-key" \
     -H "Content-Type: application/json" \
     -d '{"email": "your.email@gmail.com"}'
   ```

2. Try logging in with that email
3. Should succeed and redirect to `/home`

### Test Denied User

1. Try logging in with an email NOT in allowlist
2. Should see error message
3. Should stay on login page

---

## Firestore Indexes

For efficient allowlist queries, create this index:

Go to **Firestore > Indexes** and create:

- **Collection:** `allowlist`
- **Fields:** `allowed` (Ascending), `addedAt` (Descending)

---

## Cost Optimization

Allowlist operations use Firestore reads/writes:

- **Read:** 1 Firestore read per login attempt
- **Write:** 1 Firestore write per add/update
- **Bulk add:** N Firestore writes for N users

At free tier limits (50k reads/month), you can support ~1,500 login attempts per day.

---

## Next Steps

1. ✅ Set `ADMIN_API_KEY` in environment
2. ✅ Add your email to allowlist
3. ✅ Test login flow
4. ✅ Set Firestore security rules
5. ⭕ Create user management dashboard (optional)
6. ⭕ Implement audit logging (optional)

---

## Support & Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)

