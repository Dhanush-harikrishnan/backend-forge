import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateTechRoadmap, generateProjects } from '../utils/gemini.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Generate a technology learning roadmap
router.post('/generate', async (req, res) => {
    try {
        const { technology, goalLevel = 'beginner', timeframe = '3 months' } = req.body;
        
        if (!technology) {
            return res.status(400).json({ error: 'Technology name is required' });
        }
        
        // Generate roadmap using Gemini API
        try {
            const roadmap = await generateTechRoadmap({
                technology,
                goalLevel,
                timeframe
            });
            
            res.json({
                roadmap,
                message: 'Technology roadmap generated successfully'
            });
        } catch (apiError) {
            logger.error(`Error in generateTechRoadmap: ${apiError.message}`);
            
            // Generate a fallback roadmap
            const fallbackRoadmap = {
                overview: `A learning roadmap for ${technology} to reach ${goalLevel} level in ${timeframe}.`,
                prerequisites: ["Basic programming knowledge", "Problem-solving skills"],
                weeks: [
                    {
                        week: 1,
                        focus: "Getting started with fundamentals",
                        resources: [
                            {type: "documentation", title: "Official Docs", url: "https://example.com/docs"},
                            {type: "tutorial", title: "Beginner Tutorial", url: "https://example.com/tutorial"}
                        ],
                        projects: [
                            {title: "Hello World", description: "Create your first program"}
                        ],
                        milestones: ["Complete setup", "Run first program"]
                    },
                    {
                        week: 2,
                        focus: "Core concepts",
                        resources: [
                            {type: "course", title: "Online Course", url: "https://example.com/course"}
                        ],
                        projects: [
                            {title: "Simple Application", description: "Build a simple application"}
                        ],
                        milestones: ["Understand basic syntax", "Write simple programs"]
                    }
                ],
                advancedTopics: ["Advanced patterns", "Performance optimization"]
            };
            
            res.json({
                roadmap: fallbackRoadmap,
                message: 'Default roadmap generated (API unavailable)',
                warning: 'Using fallback roadmap due to API limitations'
            });
        }
    } catch (error) {
        logger.error('Error generating technology roadmap:', error);
        res.status(500).json({ 
            error: 'Error generating roadmap', 
            details: error.message,
            fallback: true
        });
    }
});

// Generate project ideas based on a technology
router.post('/project-ideas', async (req, res) => {
    try {
        const { skills, interests } = req.body;
        
        if (!skills || !interests) {
            return res.status(400).json({ error: 'Both skills and interests are required' });
        }
        
        // Generate project ideas using Gemini API
        try {
            const projectIdeas = await generateProjects({
                skills,
                interests
            });
            
            res.json({
                projectIdeas,
                message: 'Project ideas generated successfully'
            });
        } catch (apiError) {
            logger.error(`Error in generateProjects: ${apiError.message}`);
            
            // Create fallback project ideas
            const fallbackProjects = [
                {
                    title: "Personal Portfolio",
                    description: "A personal portfolio website to showcase your skills and projects.",
                    technologies: skills.slice(0, 3),
                    learningOutcomes: ["Frontend development", "Responsive design"]
                },
                {
                    title: "Task Manager",
                    description: "A simple task management application.",
                    technologies: skills.slice(0, 3),
                    learningOutcomes: ["CRUD operations", "User authentication"]
                }
            ];
            
            res.json({
                projectIdeas: fallbackProjects,
                message: 'Default project ideas generated (API unavailable)',
                warning: 'Using fallback ideas due to API limitations'
            });
        }
    } catch (error) {
        logger.error('Error generating project ideas:', error);
        res.status(500).json({ 
            error: 'Error generating project ideas', 
            details: error.message,
            fallback: true
        });
    }
});

export default router; 