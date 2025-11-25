import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin SDK (only once)
// Support multiple methods for service account authentication:
// 1. GOOGLE_SERVICE_ACCOUNT_JSON environment variable (parsed JSON)
// 2. GOOGLE_APPLICATION_CREDENTIALS environment variable (file path)
// 3. Application Default Credentials (for containerized environments)
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

let credential;

try {
  if (serviceAccountJson) {
    // Parse JSON string from environment variable
    console.log('✓ Using GOOGLE_SERVICE_ACCOUNT_JSON from environment');
    const serviceAccount = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(serviceAccount);
  } else if (serviceAccountPath) {
    // Read and parse service account from file path
    console.log(`✓ Reading service account from: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Use application default credentials (for deployment environments with proper IAM roles)
    console.log('✓ Using Application Default Credentials (ADC)');
    credential = admin.credential.applicationDefault();
  }
} catch (error) {
  console.error('❌ Error loading service account credentials:', error.message);
  process.exit(1);
}

// Initialize Firebase Admin SDK (singleton)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
    });
    console.log('✓ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, continue
    console.log('✓ Firebase app already initialized');
  } else {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

/**
 * Multi-Database Firestore Manager
 * Manages connections to multiple Firestore databases for different products
 */
class FirestoreManager {
  constructor() {
    this.databases = new Map();
    this.validated = false;
  }

  /**
   * Get database configuration (lazy loaded from environment variables)
   */
  getDatabaseConfig() {
    return {
      storylab: process.env.STORYLAB_DATABASE_ID,
      gamelab: process.env.GAMELAB_DATABASE_ID,
    };
  }

  /**
   * Validate that all required database IDs are configured (lazy validation)
   */
  validateConfiguration() {
    if (this.validated) return;

    const databaseConfig = this.getDatabaseConfig();
    const missingDatabases = [];

    for (const [product, databaseId] of Object.entries(databaseConfig)) {
      if (!databaseId) {
        missingDatabases.push(product);
      }
    }

    if (missingDatabases.length > 0) {
      console.error('❌ Missing database configuration for products:', missingDatabases.join(', '));
      console.error('   Please set the following environment variables:');
      missingDatabases.forEach(product => {
        console.error(`   - ${product.toUpperCase()}_DATABASE_ID`);
      });
      process.exit(1);
    }

    console.log('✓ Database configuration validated');
    console.log('  - StoryLab database:', databaseConfig.storylab);
    console.log('  - GameLab database:', databaseConfig.gamelab);

    this.validated = true;
  }

  /**
   * Get or create a Firestore database connection for a specific product
   * @param {string} productId - Product identifier ('storylab' or 'gamelab')
   * @returns {FirebaseFirestore.Firestore} Firestore database instance
   */
  getDatabase(productId) {
    // Validate configuration on first access
    this.validateConfiguration();

    // Validate product ID
    if (!['storylab', 'gamelab'].includes(productId)) {
      throw new Error(`Invalid product ID: ${productId}. Must be 'storylab' or 'gamelab'`);
    }

    // Return cached connection if exists
    if (this.databases.has(productId)) {
      return this.databases.get(productId);
    }

    // Get database ID from configuration
    const databaseConfig = this.getDatabaseConfig();
    const databaseId = databaseConfig[productId];

    if (!databaseId) {
      throw new Error(
        `Database ID not configured for product: ${productId}. ` +
        `Please set ${productId.toUpperCase()}_DATABASE_ID environment variable.`
      );
    }

    // Create new Firestore instance with product-specific database
    try {
      // Use getFirestore with database ID to connect to the named database
      // This creates a separate Firestore instance for each database
      const db = getFirestore(admin.app(), databaseId);

      // Cache the connection
      this.databases.set(productId, db);

      console.log(`✓ Connected to ${productId} database: ${databaseId}`);

      return db;
    } catch (error) {
      console.error(`❌ Error connecting to ${productId} database:`, error.message);
      throw error;
    }
  }

  /**
   * Get all active database connections
   * @returns {Array<FirebaseFirestore.Firestore>} Array of database instances
   */
  getAllDatabases() {
    return Array.from(this.databases.values());
  }

  /**
   * Get database ID for a product (for logging/debugging)
   * @param {string} productId - Product identifier
   * @returns {string} Database ID
   */
  getDatabaseId(productId) {
    const databaseConfig = this.getDatabaseConfig();
    return databaseConfig[productId];
  }

  /**
   * Close all database connections (for graceful shutdown)
   */
  async closeAll() {
    console.log('⚠️  Closing all database connections...');
    this.databases.clear();
    await admin.app().delete();
    console.log('✓ All database connections closed');
  }
}

// Singleton instance
export const firestoreManager = new FirestoreManager();

// Export admin for compatibility
export { admin };

// Export legacy db for backward compatibility (defaults to StoryLab)
// This allows existing code to continue working during migration
// Note: This will be initialized lazily when first accessed
let legacyDb = null;
export const db = new Proxy({}, {
  get(target, prop) {
    if (!legacyDb) {
      legacyDb = firestoreManager.getDatabase('storylab');
    }
    return legacyDb[prop];
  }
});
