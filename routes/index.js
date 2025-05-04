import { Router } from 'express';
import authRoutes from './auth.js';
import projectRoutes from './projects.js';
import resumeRoutes from './resume.js';
import exploreRoutes from './explore.js';
import aiRoutes from './ai.js';
import userRoutes from './user.js';
import roadmapRoutes from './roadmap.js';
import settingsRoutes from './settings.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/projects', authenticateToken, projectRoutes);
router.use('/resume', authenticateToken, resumeRoutes);
router.use('/explore', authenticateToken, exploreRoutes);
router.use('/ai', authenticateToken, aiRoutes);
router.use('/user', authenticateToken, userRoutes);
router.use('/roadmap', authenticateToken, roadmapRoutes);
router.use('/settings', authenticateToken, settingsRoutes);

export default router; 