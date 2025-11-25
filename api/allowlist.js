import express from 'express';
import {
  addToAllowlist,
  removeFromAllowlist,
  getAllowlist,
  bulkAddToAllowlist,
} from './core/utils/firestoreUtils.js';

const router = express.Router();

// Middleware to check admin key (use environment variable in production)
const requireAdminKey = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      error: 'Admin API key not configured',
    });
  }

  if (adminKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Invalid admin key.',
    });
  }

  next();
};

/**
 * GET /api/allowlist
 * Get all users in the allowlist (admin only)
 *
 * Headers:
 * X-Admin-Key: <admin_api_key>
 */
router.get('/', requireAdminKey, async (req, res) => {
  try {
    const allowlist = await getAllowlist();

    return res.status(200).json({
      success: true,
      count: allowlist.length,
      allowlist,
    });
  } catch (error) {
    console.error('Error fetching allowlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch allowlist',
    });
  }
});

/**
 * POST /api/allowlist/add
 * Add a user to the allowlist (admin only)
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "name": "User Name" (optional),
 *   "department": "Sales" (optional)
 * }
 *
 * Headers:
 * X-Admin-Key: <admin_api_key>
 */
router.post('/add', requireAdminKey, async (req, res) => {
  try {
    const { email, name, department } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    await addToAllowlist(email, {
      name,
      department,
    });

    return res.status(201).json({
      success: true,
      message: `User ${email} added to allowlist`,
      email,
    });
  } catch (error) {
    console.error('Error adding user to allowlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add user to allowlist',
    });
  }
});

/**
 * POST /api/allowlist/bulk-add
 * Bulk add users to the allowlist (admin only)
 *
 * Request body:
 * {
 *   "emails": ["user1@example.com", "user2@example.com", ...]
 * }
 *
 * Headers:
 * X-Admin-Key: <admin_api_key>
 */
router.post('/bulk-add', requireAdminKey, async (req, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Emails array is required and must not be empty',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format(s)',
        invalidEmails,
      });
    }

    await bulkAddToAllowlist(emails);

    return res.status(201).json({
      success: true,
      message: `Added ${emails.length} users to allowlist`,
      count: emails.length,
    });
  } catch (error) {
    console.error('Error bulk adding users to allowlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk add users to allowlist',
    });
  }
});

/**
 * DELETE /api/allowlist/:email
 * Remove a user from the allowlist (admin only)
 *
 * Headers:
 * X-Admin-Key: <admin_api_key>
 */
router.delete('/:email', requireAdminKey, async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    await removeFromAllowlist(email);

    return res.status(200).json({
      success: true,
      message: `User ${email} removed from allowlist`,
      email,
    });
  } catch (error) {
    console.error('Error removing user from allowlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove user from allowlist',
    });
  }
});

export default router;
