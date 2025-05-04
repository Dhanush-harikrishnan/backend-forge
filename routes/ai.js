import { Router } from 'express';
import { generateProjectIdeas, analyzeResume, getCareerRecommendations, generateProjectRoadmap } from '../controllers/aiController.js';
import { validateAIRequest } from '../middleware/validation.js';

const router = Router();

// Generate project ideas based on user's skills and interests
router.post('/project-ideas', validateAIRequest, generateProjectIdeas);

// Analyze resume and provide feedback
router.post('/analyze-resume', validateAIRequest, analyzeResume);

// Get career recommendations based on user profile
router.post('/career-recommendations', validateAIRequest, getCareerRecommendations);

// Generate detailed project roadmap
router.post('/project-roadmap', validateAIRequest, generateProjectRoadmap);

export default router; 