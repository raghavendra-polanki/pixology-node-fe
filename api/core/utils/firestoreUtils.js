import { db, authDb } from '../config/firestore.js';

/**
 * Save or update a user document in Firestore
 * @param {string} userId - User ID (from Google OAuth)
 * @param {object} userData - User data to save
 * @returns {Promise<void>}
 */
export const saveUser = async (userId, userData) => {
  try {
    await authDb.collection('users').doc(userId).set(
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
    const doc = await authDb.collection('users').doc(userId).get();
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
 * Search users by email or name (for auto-suggest in share dialogs)
 * @param {string} query - Search query (partial email or name)
 * @param {number} limit - Max results to return (default 10)
 * @returns {Promise<array>} Array of matching users
 */
export const searchUsers = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const queryLower = query.toLowerCase();

    // Firestore doesn't support LIKE queries, so we fetch all users and filter
    // In production with many users, consider using a search service like Algolia
    const snapshot = await authDb.collection('users').get();

    const matchingUsers = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((user) => {
        const emailMatch = user.email?.toLowerCase().includes(queryLower);
        const nameMatch = user.name?.toLowerCase().includes(queryLower);
        return emailMatch || nameMatch;
      })
      .slice(0, limit)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      }));

    return matchingUsers;
  } catch (error) {
    console.error('Error searching users:', error);
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
    const snapshot = await authDb
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
    await authDb.collection('users').doc(userId).delete();
    console.log(`User ${userId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Save a project to the centralized projects collection
 * Supports creating new projects or updating existing ones
 * @param {object} projectData - Project data (title, description, thumbnail, status, etc.)
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @param {string} [projectId] - Optional Project ID. If not provided, auto-generates one (for updates)
 * @returns {Promise<string>} Project ID
 */
export const saveProject = async (projectData, database, projectId) => {
  try {
    const dbInstance = database || db;
    // Generate a new project ID if not provided
    const finalProjectId = projectId || dbInstance.collection('projects').doc().id;

    // Prepare the project document
    const projectDoc = {
      ...projectData,
      createdAt: projectData.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(projectDoc).forEach((key) => projectDoc[key] === undefined && delete projectDoc[key]);

    // Save to the centralized projects collection
    await dbInstance.collection('projects').doc(finalProjectId).set(projectDoc, { merge: true });

    // Add the owner to the members list with 'owner' role if this is a new project
    if (!projectId) {
      const ownerId = projectData.ownerId || projectData.userId;
      if (ownerId) {
        await addProjectMember(finalProjectId, ownerId, 'owner', dbInstance);
      }
    }

    console.log(`Project ${finalProjectId} saved successfully`);
    return finalProjectId;
  } catch (error) {
    console.error(`Error saving project:`, error);
    throw error;
  }
};

/**
 * Get all projects (for super users)
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<array>} Array of all projects
 */
export const getAllProjects = async (database) => {
  try {
    const dbInstance = database || db;
    const snapshot = await dbInstance
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching all projects:', error);
    throw error;
  }
};

/**
 * Get all projects accessible to a user (owned or member of)
 * Note: Uses client-side filtering due to Firestore limitations with nested field queries
 * In production, consider using a separate members collection or array structure
 * @param {string} userId - User ID
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<array>} Array of projects where user is a member
 */
export const getUserProjects = async (userId, database) => {
  try {
    const dbInstance = database || db;
    // Get all projects (in production, consider pagination or separate members collection)
    const snapshot = await dbInstance
      .collection('projects')
      .orderBy('updatedAt', 'desc')
      .get();

    // Filter to only projects where user is a member
    const userProjects = snapshot.docs
      .filter((doc) => {
        const members = doc.data().members || {};
        return userId in members;
      })
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    return userProjects;
  } catch (error) {
    console.error(`Error fetching projects for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get a single project
 * @param {string} projectId - Project ID
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<object|null>} Project data or null if not found
 */
export const getProject = async (projectId, database) => {
  try {
    const dbInstance = database || db;
    const doc = await dbInstance.collection('projects').doc(projectId).get();

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
 * Delete a project (only owner can delete)
 * @param {string} projectId - Project ID
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<void>}
 */
export const deleteProject = async (projectId, database) => {
  try {
    const dbInstance = database || db;
    await dbInstance.collection('projects').doc(projectId).delete();
    console.log(`Project ${projectId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting project:`, error);
    throw error;
  }
};

/**
 * Add a member to a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to add
 * @param {string} role - Role: 'owner', 'editor', or 'viewer'
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<void>}
 */
export const addProjectMember = async (projectId, userId, role = 'viewer', database) => {
  try {
    const dbInstance = database || db;
    const validRoles = ['owner', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    await dbInstance
      .collection('projects')
      .doc(projectId)
      .update({
        [`members.${userId}`]: role,
      });

    console.log(`User ${userId} added to project ${projectId} with role ${role}`);
  } catch (error) {
    console.error(`Error adding member to project:`, error);
    throw error;
  }
};

/**
 * Remove a member from a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to remove
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<void>}
 */
export const removeProjectMember = async (projectId, userId, database) => {
  try {
    const dbInstance = database || db;
    const admin = await import('../config/firestore.js');
    await dbInstance
      .collection('projects')
      .doc(projectId)
      .update({
        [`members.${userId}`]: admin.admin.firestore.FieldValue.delete(),
      });

    console.log(`User ${userId} removed from project ${projectId}`);
  } catch (error) {
    console.error(`Error removing member from project:`, error);
    throw error;
  }
};

/**
 * Update a member's role in a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @param {string} newRole - New role: 'owner', 'editor', or 'viewer'
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<void>}
 */
export const updateProjectMember = async (projectId, userId, newRole, database) => {
  try {
    const dbInstance = database || db;
    const validRoles = ['owner', 'editor', 'viewer'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
    }

    await dbInstance
      .collection('projects')
      .doc(projectId)
      .update({
        [`members.${userId}`]: newRole,
      });

    console.log(`User ${userId} role updated to ${newRole} in project ${projectId}`);
  } catch (error) {
    console.error(`Error updating member role:`, error);
    throw error;
  }
};

/**
 * Get all members of a project
 * @param {string} projectId - Project ID
 * @param {object} [database] - Optional database instance (defaults to global db)
 * @returns {Promise<array>} Array of members with their roles
 */
export const getProjectMembers = async (projectId, database) => {
  try {
    const dbInstance = database || db;
    const doc = await dbInstance.collection('projects').doc(projectId).get();

    if (!doc.exists) {
      return [];
    }

    const members = doc.data().members || {};
    return Object.entries(members).map(([userId, role]) => ({
      userId,
      role,
    }));
  } catch (error) {
    console.error(`Error fetching project members:`, error);
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
    const doc = await authDb.collection('allowlist').doc(email).get();
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
    await authDb.collection('allowlist').doc(email).set({
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
    await authDb.collection('allowlist').doc(email).delete();
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
    const snapshot = await authDb
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
    const batch = authDb.batch();

    for (const email of emails) {
      const ref = authDb.collection('allowlist').doc(email);
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

/**
 * Update a project with generated personas
 * Merges the generated personas with the project's aiGeneratedPersonas field
 * @param {string} projectId - Project ID
 * @param {array} personas - Array of generated persona objects
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<object>} Updated project data
 */
export const updateProjectWithPersonas = async (projectId, personas, userId) => {
  try {
    // Validate inputs
    if (!projectId || !personas || !Array.isArray(personas)) {
      throw new Error('Missing required parameters: projectId, personas array');
    }

    if (personas.length === 0) {
      throw new Error('At least one persona must be provided');
    }

    // Get current project to verify ownership and merge data
    const projectDoc = await db.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }

    const projectData = projectDoc.data();

    // Verify user has access (is owner or editor)
    const members = projectData.members || {};
    const userRole = members[userId];

    if (!userRole || (userRole !== 'owner' && userRole !== 'editor')) {
      throw new Error(`User does not have permission to update project ${projectId}`);
    }

    // Create aiGeneratedPersonas structure
    const aiGeneratedPersonas = {
      personas: personas,
      generatedAt: new Date(),
      generationRecipeId: 'persona-generation-v1',
      generationExecutionId: `exec-${projectId}-${Date.now()}`,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      count: personas.length,
    };

    // Update project with new personas
    await db.collection('projects').doc(projectId).update({
      aiGeneratedPersonas: aiGeneratedPersonas,
      updatedAt: new Date(),
    });

    // Fetch and return updated project
    const updatedDoc = await db.collection('projects').doc(projectId).get();

    if (!updatedDoc.exists) {
      throw new Error('Failed to retrieve updated project');
    }

    const updatedProjectData = {
      id: projectId,
      ...updatedDoc.data(),
    };

    console.log(`Project ${projectId} updated with ${personas.length} personas`);

    return updatedProjectData;
  } catch (error) {
    console.error(`Error updating project with personas:`, error);
    throw error;
  }
};

/**
 * Get personas for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<array|null>} Array of personas or null if not found
 */
export const getProjectPersonas = async (projectId) => {
  try {
    const doc = await db.collection('projects').doc(projectId).get();

    if (!doc.exists) {
      return null;
    }

    const projectData = doc.data();
    return projectData.aiGeneratedPersonas?.personas || null;
  } catch (error) {
    console.error(`Error fetching personas for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Delete personas from a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<void>}
 */
export const deleteProjectPersonas = async (projectId, userId) => {
  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }

    const projectData = projectDoc.data();
    const members = projectData.members || {};
    const userRole = members[userId];

    if (!userRole || (userRole !== 'owner' && userRole !== 'editor')) {
      throw new Error(`User does not have permission to delete personas from project ${projectId}`);
    }

    // Delete aiGeneratedPersonas field
    await db.collection('projects').doc(projectId).update({
      aiGeneratedPersonas: db.FieldValue.delete(),
      updatedAt: new Date(),
    });

    console.log(`Personas deleted from project ${projectId}`);
  } catch (error) {
    console.error(`Error deleting personas from project:`, error);
    throw error;
  }
};
