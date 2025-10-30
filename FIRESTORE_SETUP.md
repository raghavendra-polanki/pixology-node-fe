# Firestore Setup Guide

This guide explains how to set up and use Firestore as your NoSQL database for Pixology.

---

## Prerequisites

- Firebase project already created in Google Cloud Console
- Firestore database created (can use free tier)
- Service account credentials downloaded

---

## Setup Instructions

### 1. Download Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Service Accounts**
4. Find the default service account or create a new one
5. Click on the service account email
6. Go to the **Keys** tab
7. Click **Add Key** > **Create new key** > **JSON**
8. Save the downloaded JSON file as `serviceAccountKey.json` in the project root

### 2. Project Structure

The Firestore implementation is organized as follows:

```
pixology-node-fe/
├── api/
│   ├── config/
│   │   └── firestore.js          # Firebase Admin SDK initialization
│   ├── utils/
│   │   └── firestoreUtils.js     # Reusable Firestore operations
│   └── auth.js                    # Updated to save users to Firestore
├── serviceAccountKey.json         # Service account credentials (gitignored)
└── FIRESTORE_SETUP.md            # This file
```

### 3. Environment Variables

Add the following to your `.env.local` and `.env.production`:

```bash
# .env.local (development)
FIREBASE_PROJECT_ID=your-firebase-project-id

# .env.production
FIREBASE_PROJECT_ID=your-firebase-project-id
```

Replace `your-firebase-project-id` with your actual Firebase project ID.

---

## Database Schema

### Users Collection

Path: `/users/{userId}`

```javascript
{
  id: "google_user_id",
  email: "user@example.com",
  name: "User Name",
  picture: "https://lh3.googleusercontent.com/...",
  lastLogin: 2024-10-30T10:15:30.000Z,
  createdAt: 2024-10-30T09:00:00.000Z,
  updatedAt: 2024-10-30T10:15:30.000Z
}
```

### Projects Subcollection

Path: `/users/{userId}/projects/{projectId}`

```javascript
{
  id: "project_uuid",
  title: "My First Storyline",
  description: "AI-generated digital avatar storyline",
  thumbnail: "https://...",
  status: "draft", // draft, published, archived
  createdAt: 2024-10-30T09:00:00.000Z,
  updatedAt: 2024-10-30T10:15:30.000Z,
  data: {
    // Project-specific data
  }
}
```

---

## Usage Examples

### 1. Initialize Firestore (automatic on server start)

```javascript
import { db } from './api/config/firestore.js';
```

### 2. Save a User

Users are automatically saved when they log in via Google OAuth. The `api/auth.js` file handles this:

```javascript
import { saveUser } from './api/utils/firestoreUtils.js';

await saveUser('google_user_id', {
  id: 'google_user_id',
  email: 'user@example.com',
  name: 'User Name',
  picture: 'https://...',
  lastLogin: new Date(),
});
```

### 3. Get a User

```javascript
import { getUser } from './api/utils/firestoreUtils.js';

const user = await getUser('google_user_id');
if (user) {
  console.log('User found:', user);
} else {
  console.log('User not found');
}
```

### 4. Get User by Email

```javascript
import { getUserByEmail } from './api/utils/firestoreUtils.js';

const user = await getUserByEmail('user@example.com');
```

### 5. Save a Project

```javascript
import { saveProject } from './api/utils/firestoreUtils.js';

await saveProject('google_user_id', 'project_uuid', {
  title: 'My Storyline',
  description: 'A description',
  thumbnail: 'https://...',
  status: 'draft',
  data: { /* project data */ },
});
```

### 6. Get User Projects

```javascript
import { getUserProjects } from './api/utils/firestoreUtils.js';

const projects = await getUserProjects('google_user_id');
projects.forEach(project => {
  console.log(`${project.title} - ${project.status}`);
});
```

### 7. Get a Single Project

```javascript
import { getProject } from './api/utils/firestoreUtils.js';

const project = await getProject('google_user_id', 'project_uuid');
```

### 8. Delete a Project

```javascript
import { deleteProject } from './api/utils/firestoreUtils.js';

await deleteProject('google_user_id', 'project_uuid');
```

### 9. Batch Operations

```javascript
import { batchWrite } from './api/utils/firestoreUtils.js';

const operations = [
  {
    collection: 'users',
    doc: 'user_id_1',
    data: { name: 'User 1', email: 'user1@example.com' },
    action: 'set',
  },
  {
    collection: 'users',
    doc: 'user_id_2',
    data: { lastLogin: new Date() },
    action: 'update',
  },
  {
    collection: 'users',
    doc: 'user_id_3',
    action: 'delete',
  },
];

await batchWrite(operations);
```

---

## Creating API Endpoints with Firestore

### Example: Get User Profile

Create a new endpoint in `api/profile.js`:

```javascript
import express from 'express';
import { getUser } from './utils/firestoreUtils.js';

const router = express.Router();

// GET /api/profile/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
});

export default router;
```

Register it in `server.js`:

```javascript
import profileRouter from './api/profile.js';

app.use('/api/profile', profileRouter);
```

### Example: Create Project

Create a new endpoint in `api/projects.js`:

```javascript
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { saveProject, getUserProjects } from './utils/firestoreUtils.js';

const router = express.Router();

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { userId, title, description, thumbnail } = req.body;

    if (!userId || !title) {
      return res.status(400).json({
        success: false,
        error: 'userId and title are required',
      });
    }

    const projectId = uuidv4();

    await saveProject(userId, projectId, {
      title,
      description,
      thumbnail,
      status: 'draft',
    });

    return res.status(201).json({
      success: true,
      projectId,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

// GET /api/projects/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const projects = await getUserProjects(userId);

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

export default router;
```

---

## Security Rules

Set up Firestore Security Rules in the Firebase Console:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write only their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      match /projects/{projectId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

---

## Firestore Indexing

For queries like `getUserProjects()`, you may need to create indexes:

1. Go to Firebase Console > Firestore > Indexes
2. Create a composite index for:
   - Collection: `users/{userId}/projects`
   - Fields: `updatedAt` (Descending)

---

## Backup & Recovery

### Enable Automated Backups (Production)

1. Go to Firebase Console > Firestore > Backups
2. Enable automatic backups
3. Set frequency and retention policy

### Manual Backup

Use the Firebase CLI:

```bash
firebase firestore:export gs://your-bucket/backup-date

firebase firestore:import gs://your-bucket/backup-date
```

---

## Monitoring & Cost

### View Firestore Usage

1. Firebase Console > Firestore > Usage
2. Monitor:
   - Read operations
   - Write operations
   - Delete operations
   - Storage usage

### Cost Optimization

- Use batch operations to reduce write count
- Index only necessary fields
- Set appropriate TTL for temporary data
- Archive old projects

---

## Troubleshooting

### "Cannot find serviceAccountKey.json"

Ensure the file is in the project root and the path in `firestore.js` is correct.

### "Permission denied" errors

Check Firestore Security Rules in Firebase Console.

### "Quota exceeded" errors

You've exceeded the free tier limits. Upgrade to a paid plan in Firebase Console.

### "Cannot find firebase-admin"

Run: `npm install firebase-admin`

---

## Next Steps

1. ✅ Download and save `serviceAccountKey.json`
2. ✅ Set environment variables
3. ✅ Test Firestore connection
4. ⭕ Create additional API endpoints for your features
5. ⭕ Implement Firestore Security Rules
6. ⭕ Set up automated backups

---

## Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase CLI](https://firebase.google.com/docs/cli)

