import express from 'express';
import { registerUser, loginUser, getUserProfile } from '../controllers/userController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/user/register
 * Body: { name, email }
 * Purpose: Register a new user
 */
router.post('/register', registerUser);

/**
 * POST /api/user/login
 * Body: { email }
 * Purpose: Basic login (no password) just to get user info for now
 */
router.post('/login', loginUser);

/**
 * GET /api/users/profile
 * Purpose: Get user profile (protected route)
 */
router.get('/profile', authenticateUser, getUserProfile);

export default router;
