import { db } from '../config/firestore.js';

/**
 * Save or update a user document in Firestore
 * @param {string} userId - User ID (from Google OAuth)
 * @param {object} userData - User data to save
 * @returns {Promise<void>}
 */
export const saveUser = async (userId, userData) => {
  try {
    await db.collection('users').doc(userId).set(
      {
        ...userData,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    console.log(`User ${userId} saved successfully`);
  } catch (error) {
    console.error(`Error saving user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get a user document from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User data or null if not found
 */
export const getUser = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<object|null>} User data or null if not found
 */
export const getUserByEmail = async (email) => {
  try {
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    console.error(`Error fetching user by email ${email}:`, error);
    throw error;
  }
};

/**
 * Delete a user document
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId) => {
  try {
    await db.collection('users').doc(userId).delete();
    console.log(`User ${userId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Save a storyline/project for a user
 * @param {string} userId - User ID (owner)
 * @param {string} projectId - Project ID
 * @param {object} projectData - Project data
 * @returns {Promise<void>}
 */
export const saveProject = async (userId, projectId, projectData) => {
  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .set(
        {
          ...projectData,
          createdAt: projectData.createdAt || new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    console.log(`Project ${projectId} for user ${userId} saved successfully`);
  } catch (error) {
    console.error(`Error saving project:`, error);
    throw error;
  }
};

/**
 * Get all projects for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of projects
 */
export const getUserProjects = async (userId) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error fetching projects for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get a single project
 * @param {string} userId - User ID (owner)
 * @param {string} projectId - Project ID
 * @returns {Promise<object|null>} Project data or null if not found
 */
export const getProject = async (userId, projectId) => {
  try {
    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .get();

    if (doc.exists) {
      return {
        id: doc.id,
        ...doc.data(),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Delete a project
 * @param {string} userId - User ID (owner)
 * @param {string} projectId - Project ID
 * @returns {Promise<void>}
 */
export const deleteProject = async (userId, projectId) => {
  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .delete();
    console.log(`Project ${projectId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting project:`, error);
    throw error;
  }
};

/**
 * Generic batch write for multiple operations
 * @param {array} operations - Array of {collection, doc, data, action}
 * @returns {Promise<void>}
 */
export const batchWrite = async (operations) => {
  try {
    const batch = db.batch();

    for (const op of operations) {
      const ref = db.collection(op.collection).doc(op.doc);

      if (op.action === 'set') {
        batch.set(ref, op.data, { merge: true });
      } else if (op.action === 'update') {
        batch.update(ref, op.data);
      } else if (op.action === 'delete') {
        batch.delete(ref);
      }
    }

    await batch.commit();
    console.log(`Batch write completed: ${operations.length} operations`);
  } catch (error) {
    console.error('Error during batch write:', error);
    throw error;
  }
};

/**
 * Check if a user email is in the allowlist
 * @param {string} email - User email to check
 * @returns {Promise<boolean>} True if user is allowed, false otherwise
 */
export const isUserAllowed = async (email) => {
  try {
    const doc = await db.collection('allowlist').doc(email).get();
    return doc.exists && doc.data().allowed === true;
  } catch (error) {
    console.error(`Error checking allowlist for ${email}:`, error);
    throw error;
  }
};

/**
 * Add a user to the allowlist
 * @param {string} email - User email to allow
 * @param {object} metadata - Optional metadata about the user
 * @returns {Promise<void>}
 */
export const addToAllowlist = async (email, metadata = {}) => {
  try {
    await db.collection('allowlist').doc(email).set({
      email,
      allowed: true,
      addedAt: new Date(),
      ...metadata,
    });
    console.log(`User ${email} added to allowlist`);
  } catch (error) {
    console.error(`Error adding ${email} to allowlist:`, error);
    throw error;
  }
};

/**
 * Remove a user from the allowlist
 * @param {string} email - User email to remove
 * @returns {Promise<void>}
 */
export const removeFromAllowlist = async (email) => {
  try {
    await db.collection('allowlist').doc(email).delete();
    console.log(`User ${email} removed from allowlist`);
  } catch (error) {
    console.error(`Error removing ${email} from allowlist:`, error);
    throw error;
  }
};

/**
 * Get all users in the allowlist
 * @returns {Promise<array>} Array of allowed users
 */
export const getAllowlist = async () => {
  try {
    const snapshot = await db
      .collection('allowlist')
      .where('allowed', '==', true)
      .orderBy('addedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      email: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching allowlist:', error);
    throw error;
  }
};

/**
 * Bulk add users to allowlist
 * @param {array} emails - Array of email addresses
 * @returns {Promise<void>}
 */
export const bulkAddToAllowlist = async (emails) => {
  try {
    const batch = db.batch();

    for (const email of emails) {
      const ref = db.collection('allowlist').doc(email);
      batch.set(ref, {
        email,
        allowed: true,
        addedAt: new Date(),
      });
    }

    await batch.commit();
    console.log(`Added ${emails.length} users to allowlist`);
  } catch (error) {
    console.error('Error bulk adding to allowlist:', error);
    throw error;
  }
};
