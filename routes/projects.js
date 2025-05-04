import { Router } from 'express';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply authentication middleware to all routes except public community routes
router.use('/community', (req, res, next) => {
    // Skip authentication for GET requests to community endpoints
    if (req.method === 'GET') {
        next();
    } else {
        authenticateToken(req, res, next);
    }
});

// Apply authentication to all other routes
router.use((req, res, next) => {
    if (req.path.startsWith('/community') && req.method === 'GET') {
        next();
    } else {
        authenticateToken(req, res, next);
    }
});

// Generate project recommendations
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        // This would normally connect to the Gemini API
        // For now, return mock project ideas
        const mockProjects = [
            {
                title: "Personal Portfolio Website",
                description: "A responsive portfolio website to showcase your skills and projects",
                technologies: ["React", "Tailwind CSS", "Next.js"],
                roadmap: "1. Design wireframes\n2. Develop frontend\n3. Implement animations\n4. Deploy to Vercel"
            },
            {
                title: "Task Management App",
                description: "A productivity application to manage tasks and projects",
                technologies: ["React", "Node.js", "MongoDB"],
                roadmap: "1. Design database schema\n2. Develop backend API\n3. Create frontend\n4. Implement authentication"
            }
        ];
        
        res.json(mockProjects);
    } catch (error) {
        logger.error('Route Error:', error);
        res.status(500).json({ 
            error: 'Error generating projects',
            details: error.message 
        });
    }
});

// Save a project
router.post('/save', async (req, res) => {
    try {
        const { isPublic, ...otherData } = req.body;
        
        const projectData = {
            ...otherData,
            isPublic: isPublic === true, // Default to false if not specified
            user: req.user._id // Associate with the logged-in user
        };
        
        const project = new Project(projectData);
        await project.save();
        
        // Also add to user's projects array if needed
        // await User.findByIdAndUpdate(req.user._id, { $push: { projects: project._id } });
        
        res.status(201).json(project);
    } catch (error) {
        logger.error('Save project error:', error);
        res.status(500).json({ error: 'Error saving project', details: error.message });
    }
});

// Get all saved projects for the logged-in user
router.get('/saved', async (req, res) => {
    try {
        const projects = await Project.find({ user: req.user._id })
            .sort({ updatedAt: -1 });
        res.json(projects);
    } catch (error) {
        logger.error('Fetch projects error:', error);
        res.status(500).json({ error: 'Error fetching saved projects', details: error.message });
    }
});

// Get roadmaps for the logged-in user
router.get('/roadmap', async (req, res) => {
    try {
        const projects = await Project.find({ user: req.user._id })
            .select('title roadmap')
            .sort({ updatedAt: -1 });
        res.json(projects);
    } catch (error) {
        logger.error('Fetch roadmaps error:', error);
        res.status(500).json({ error: 'Error fetching project roadmaps', details: error.message });
    }
});

// Get a specific project (only if it belongs to the user)
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
    } catch (error) {
        logger.error('Fetch project error:', error);
        res.status(500).json({ error: 'Error fetching project', details: error.message });
    }
});

// Update a project (only if it belongs to the user)
router.put('/:id', async (req, res) => {
    try {
        logger.info(`Updating project ${req.params.id} for user ${req.user._id}`);
        
        const { roadmapItems, ...otherUpdates } = req.body;
        
        logger.debug(`Request body: ${JSON.stringify(req.body).substring(0, 200)}...`);
        
        // Find the project first to properly handle roadmap items
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            logger.warn(`Project not found or unauthorized: ${req.params.id}`);
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        
        // Apply other updates
        Object.keys(otherUpdates).forEach(key => {
            project[key] = otherUpdates[key];
        });
        
        // Handle roadmap items specially to ensure proper ID generation
        if (roadmapItems && Array.isArray(roadmapItems)) {
            logger.info(`Processing ${roadmapItems.length} roadmap items`);
            
            try {
                // Clear existing items
                project.roadmapItems = [];
                
                // Add new items with proper date conversion
                roadmapItems.forEach((item, index) => {
                    try {
                        const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
                        if (isNaN(dueDate.getTime())) {
                            logger.warn(`Invalid date format for item ${index}: ${item.dueDate}`);
                            throw new Error(`Invalid date format: ${item.dueDate}`);
                        }
                        
                        project.roadmapItems.push({
                            name: item.name || `Task ${index + 1}`,
                            description: item.description || '',
                            dueDate: dueDate,
                            completed: item.completed === true,
                            category: item.category || 'task'
                        });
                    } catch (itemError) {
                        logger.error(`Error processing roadmap item ${index}: ${itemError.message}`);
                        throw itemError;
                    }
                });
                
                logger.info(`Successfully processed roadmap items`);
            } catch (roadmapError) {
                logger.error(`Error processing roadmap items: ${roadmapError.message}`);
                return res.status(400).json({ 
                    error: 'Error processing roadmap items', 
                    details: roadmapError.message 
                });
            }
        }
        
        // Save the project with the updates
        try {
            await project.save();
            logger.info(`Project ${req.params.id} successfully updated`);
            res.json(project);
        } catch (saveError) {
            logger.error(`Error saving project: ${saveError.message}`);
            res.status(500).json({ error: 'Error saving project', details: saveError.message });
        }
    } catch (error) {
        logger.error(`Update project error: ${error.message}`);
        res.status(500).json({ error: 'Error updating project', details: error.message });
    }
});

// Delete a project (only if it belongs to the user)
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        logger.error('Delete project error:', error);
        res.status(500).json({ error: 'Error deleting project', details: error.message });
    }
});

// Delete roadmap from a project (only if it belongs to the user)
router.delete('/:id/roadmap', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        
        // Clear roadmap data
        project.roadmap = undefined;
        project.roadmapItems = [];
        project.roadmapOverview = undefined;
        
        await project.save();
        
        res.json({ 
            message: 'Roadmap deleted successfully',
            project
        });
    } catch (error) {
        logger.error('Delete roadmap error:', error);
        res.status(500).json({ error: 'Error deleting roadmap', details: error.message });
    }
});

// Update a specific roadmap item (mark as complete/incomplete)
router.patch('/:id/roadmap-item/:itemId', async (req, res) => {
    try {
        const { completed } = req.body;
        
        if (typeof completed !== 'boolean') {
            return res.status(400).json({ error: 'Completed status must be a boolean' });
        }
        
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        
        // Find the roadmap item
        const roadmapItem = project.roadmapItems.id(req.params.itemId);
        if (!roadmapItem) {
            return res.status(404).json({ error: 'Roadmap item not found' });
        }
        
        // Update the item
        roadmapItem.completed = completed;
        
        // Save the project
        await project.save();
        
        res.json({ message: 'Roadmap item updated successfully', roadmapItem });
    } catch (error) {
        logger.error('Update roadmap item error:', error);
        res.status(500).json({ error: 'Error updating roadmap item', details: error.message });
    }
});

// Community routes

// Get trending projects - IMPORTANT: This must come before the /:id route to avoid conflicts
router.get('/community/trending', async (req, res) => {
    try {
        // Get projects with most stars and forks, limited to 6
        const trendingProjects = await Project.find({ isPublic: true })
            .populate('user', 'username name')
            .sort({ stars: -1, forks: -1, createdAt: -1 })
            .limit(6);
        
        res.json(trendingProjects);
    } catch (error) {
        logger.error('Fetch trending projects error:', error);
        res.status(500).json({ error: 'Error fetching trending projects', details: error.message });
    }
});

// Get all public projects for the community
router.get('/community', async (req, res) => {
    try {
        const { search, technology, sort = 'newest' } = req.query;
        
        // Build the query
        const query = { isPublic: true };
        
        // Add search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by technology
        if (technology) {
            query.technologies = { $in: [technology] };
        }
        
        // Determine sort order
        let sortOption = {};
        switch (sort) {
            case 'stars':
                sortOption = { stars: -1 };
                break;
            case 'forks':
                sortOption = { forks: -1 };
                break;
            case 'oldest':
                sortOption = { createdAt: 1 };
                break;
            case 'newest':
            default:
                sortOption = { createdAt: -1 };
        }
        
        // Execute the query with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const projects = await Project.find(query)
            .populate('user', 'username name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);
            
        // Get total count for pagination
        const total = await Project.countDocuments(query);
        
        res.json({
            projects,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Fetch community projects error:', error);
        res.status(500).json({ error: 'Error fetching community projects', details: error.message });
    }
});

// Get a specific public project
router.get('/community/:id', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            isPublic: true
        }).populate('user', 'username name');
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or not public' });
        }
        
        res.json(project);
    } catch (error) {
        logger.error('Fetch public project error:', error);
        res.status(500).json({ error: 'Error fetching project', details: error.message });
    }
});

// Toggle project visibility (public/private)
router.patch('/:id/visibility', authenticateToken, async (req, res) => {
    try {
        const { isPublic } = req.body;
        
        if (typeof isPublic !== 'boolean') {
            return res.status(400).json({ error: 'isPublic must be a boolean value' });
        }
        
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        
        project.isPublic = isPublic;
        await project.save();
        
        res.json({ 
            message: `Project is now ${isPublic ? 'public' : 'private'}`,
            project
        });
    } catch (error) {
        logger.error('Toggle project visibility error:', error);
        res.status(500).json({ error: 'Error updating project visibility', details: error.message });
    }
});

// Star a project
router.post('/community/:id/star', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            isPublic: true
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found or not public' });
        }
        
        // Check if user has already starred
        const hasStarred = project.starredBy?.includes(req.user._id);
        
        if (hasStarred) {
            // Unstar
            project.starredBy = project.starredBy.filter(id => id.toString() !== req.user._id.toString());
            project.stars = Math.max(0, project.stars - 1);
        } else {
            // Star
            if (!project.starredBy) project.starredBy = [];
            project.starredBy.push(req.user._id);
            project.stars = (project.stars || 0) + 1;
        }
        
        await project.save();
        
        res.json({
            message: hasStarred ? 'Project unstarred' : 'Project starred',
            project
        });
    } catch (error) {
        logger.error('Star project error:', error);
        res.status(500).json({ error: 'Error starring project', details: error.message });
    }
});

// Fork a project
router.post('/community/:id/fork', authenticateToken, async (req, res) => {
    try {
        const sourceProject = await Project.findOne({
            _id: req.params.id,
            isPublic: true
        });
        
        if (!sourceProject) {
            return res.status(404).json({ error: 'Project not found or not public' });
        }
        
        // Check if user already has a fork of this project
        const existingFork = await Project.findOne({
            forkedFrom: sourceProject._id,
            user: req.user._id
        });
        
        if (existingFork) {
            return res.status(400).json({ 
                error: 'You already have a fork of this project',
                projectId: existingFork._id
            });
        }
        
        // Create a new project as a fork
        const forkedProject = new Project({
            title: `${sourceProject.title} (Fork)`,
            description: sourceProject.description,
            technologies: sourceProject.technologies,
            status: 'Planned',
            isPublic: false, // Default to private
            tasks: sourceProject.tasks,
            roadmap: sourceProject.roadmap,
            roadmapItems: sourceProject.roadmapItems,
            roadmapOverview: sourceProject.roadmapOverview,
            githubUrl: sourceProject.githubUrl,
            demoUrl: sourceProject.demoUrl,
            imageUrl: sourceProject.imageUrl,
            user: req.user._id,
            forkedFrom: sourceProject._id
        });
        
        await forkedProject.save();
        
        // Update the original project's fork count
        sourceProject.forks = (sourceProject.forks || 0) + 1;
        await sourceProject.save();
        
        res.status(201).json({
            message: 'Project forked successfully',
            project: forkedProject
        });
    } catch (error) {
        logger.error('Fork project error:', error);
        res.status(500).json({ error: 'Error forking project', details: error.message });
    }
});

// Get trending projects
router.get('/community/trending', async (req, res) => {
    try {
        // Get projects with most stars in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const trendingProjects = await Project.find({
            isPublic: true,
            updatedAt: { $gte: thirtyDaysAgo }
        })
        .populate('user', 'username name')
        .sort({ stars: -1, forks: -1 })
        .limit(10);
        
        res.json(trendingProjects);
    } catch (error) {
        logger.error('Fetch trending projects error:', error);
        res.status(500).json({ error: 'Error fetching trending projects', details: error.message });
    }
});

export default router;