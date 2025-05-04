import { Router } from 'express';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateResume } from '../utils/gemini.js';
import { logger } from '../utils/logger.js';
import { generateResumePDF } from '../utils/pdfGenerator.js';
import { generateTEDResume } from '../utils/tedTemplate.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Generate a resume using AI
router.post('/generate', async (req, res) => {
    try {
        // Get the user's profile data
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Additional profile data can be passed in the request body
        const profileData = {
            name: user.name,
            email: user.email,
            skills: user.skills || [],
            bio: user.bio || '',
            ...req.body // Allow overriding with request data
        };
        
        // Generate resume content using Gemini API
        try {
            const resumeContent = await generateResume(profileData);
            
            // Check if this is a fallback template by looking for specific content
            const isFallback = 
                resumeContent.experience?.length === 2 && 
                resumeContent.experience[0]?.company === "Tech Solutions Inc." && 
                resumeContent.education?.length === 1 && 
                resumeContent.education[0]?.institution === "University of Technology";
            
            // Format the response for frontend use
            res.json({
                resumeContent,
                message: isFallback 
                    ? 'Resume generated with default template due to API limitations' 
                    : 'Resume generated successfully',
                warning: isFallback ? 'Using a default template because the AI service is currently unavailable' : undefined
            });
        } catch (apiError) {
            logger.error(`Error in generateResume API: ${apiError.message}`);
            
            // Create a default resume
            const defaultResume = {
                summary: `${profileData.name} is a professional with expertise in ${profileData.skills?.slice(0, 3).join(', ') || 'technology'}. ${profileData.bio || ''}`,
                experience: [
                    {
                        company: "Tech Company",
                        position: "Senior Developer",
                        startDate: "2020-01",
                        endDate: "Present",
                        description: "Lead developer responsible for creating and maintaining applications",
                        bullets: [
                            "Developed multiple web applications using modern frameworks",
                            "Collaborated with team members to deliver projects on time",
                            "Implemented best practices for code quality and performance"
                        ]
                    },
                    {
                        company: "Previous Company",
                        position: "Developer",
                        startDate: "2017-03",
                        endDate: "2019-12",
                        description: "Full-stack development for various projects",
                        bullets: [
                            "Built responsive web applications",
                            "Worked in an agile environment",
                            "Maintained and improved existing systems"
                        ]
                    }
                ],
                education: [
                    {
                        institution: "University",
                        degree: "Bachelor's Degree",
                        field: "Computer Science",
                        startDate: "2013-09",
                        endDate: "2017-05",
                        gpa: "3.5/4.0"
                    }
                ],
                projects: [
                    {
                        title: "Project 1",
                        description: "A web application with various features",
                        technologies: profileData.skills?.slice(0, 3) || ["Web Development"],
                        url: "https://example.com",
                        github: "https://github.com/user/project"
                    },
                    {
                        title: "Project 2",
                        description: "Another important project demonstrating skills",
                        technologies: profileData.skills?.slice(0, 3) || ["Web Development"],
                        url: "https://example.com",
                        github: "https://github.com/user/project2"
                    }
                ]
            };
            
            res.json({
                resumeContent: defaultResume,
                message: 'Resume generated with default template',
                warning: 'Using a default template because the AI service is currently unavailable'
            });
        }
    } catch (error) {
        logger.error('Error generating resume:', error);
        res.status(500).json({ 
            error: 'Error generating resume', 
            details: error.message,
            fallback: true
        });
    }
});

// Create a new resume
router.post('/create', async (req, res) => {
    try {
        const resumeData = {
            ...req.body,
            user: req.user._id // Associate with the logged-in user
        };
        
        const resume = new Resume(resumeData);
        await resume.save();
        res.status(201).json(resume);
    } catch (error) {
        res.status(500).json({ error: 'Error creating resume', details: error.message });
    }
});

// Save an AI-generated resume
router.post('/save-generated', async (req, res) => {
    try {
        // Extract resume data from request
        const { personalInfo, education, experience, skills, projects, summary } = req.body;
        
        if (!personalInfo) {
            return res.status(400).json({ error: 'Personal information is required' });
        }
        
        // Create resume document
        const resumeData = {
            user: req.user._id,
            personalInfo,
            education: education || [],
            experience: experience || [],
            skills: skills || [],
            projects: projects || [],
            summary: summary || ''
        };
        
        const resume = new Resume(resumeData);
        await resume.save();
        
        // Generate PDF and TED resumes after saving to get the resume ID
        try {
            // Generate both formats in parallel
            const [pdfPath, tedPath] = await Promise.all([
                generateResumePDF(resumeData, req.user._id, resume._id),
                generateTEDResume(resumeData, resume._id)
            ]);
            
            // Update resume with file paths and URLs
            const pdfUrl = `/static/resumes/${resume._id}.pdf`;
            const tedUrl = `/static/resumes/${resume._id}.html`;
            
            resume.pdfPath = pdfPath;
            resume.pdfUrl = pdfUrl;
            resume.tedPath = tedPath;
            resume.tedUrl = tedUrl;
            
            await resume.save();
            
            logger.info(`Resume files generated for resume ID: ${resume._id}`);
        } catch (genError) {
            logger.error('Error generating resume files:', genError);
            // Continue with response, even if file generation fails
        }
        
        res.status(201).json({
            id: resume._id,
            pdfUrl: resume.pdfUrl,
            tedUrl: resume.tedUrl,
            message: 'AI-generated resume saved successfully'
        });
    } catch (error) {
        logger.error('Error saving generated resume:', error);
        res.status(500).json({ 
            error: 'Error saving resume', 
            details: error.message 
        });
    }
});

// Get all resumes for the logged-in user
router.get('/all', async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user._id }).sort({ updatedAt: -1 });
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching resumes', details: error.message });
    }
});

// Get a specific resume (only if it belongs to the user)
router.get('/:id', async (req, res) => {
    try {
        const resume = await Resume.findOne({ 
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        
        res.json(resume);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching resume', details: error.message });
    }
});

// Update a resume (only if it belongs to the user)
router.put('/:id', async (req, res) => {
    try {
        const resume = await Resume.findOneAndUpdate(
            { 
                _id: req.params.id,
                user: req.user._id
            },
            req.body,
            { new: true }
        );
        
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found or unauthorized' });
        }
        
        res.json(resume);
    } catch (error) {
        res.status(500).json({ error: 'Error updating resume', details: error.message });
    }
});

// Delete a resume (only if it belongs to the user)
router.delete('/:id', async (req, res) => {
    try {
        const resume = await Resume.findOneAndDelete({ 
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found or unauthorized' });
        }
        
        res.json({ message: 'Resume deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting resume', details: error.message });
    }
});

// Add a new endpoint to download the PDF resume
router.get('/:id/pdf', async (req, res) => {
    try {
        const resume = await Resume.findOne({ 
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        
        if (!resume.pdfPath) {
            // If PDF doesn't exist yet, generate it now
            try {
                const resumeData = {
                    personalInfo: resume.personalInfo,
                    education: resume.education,
                    experience: resume.experience,
                    skills: resume.skills,
                    projects: resume.projects,
                    summary: resume.summary
                };
                
                const pdfPath = await generateResumePDF(resumeData, req.user._id, resume._id);
                
                // Update resume with PDF path
                resume.pdfPath = pdfPath;
                await resume.save();
                
                logger.info(`PDF resume generated on-demand for resume ID: ${resume._id}`);
            } catch (pdfError) {
                logger.error('Error generating PDF resume on-demand:', pdfError);
                return res.status(500).json({ error: 'Error generating PDF resume' });
            }
        }
        
        // Send the PDF file
        res.download(resume.pdfPath, `resume-${resume._id}.pdf`);
    } catch (error) {
        logger.error('Error downloading resume PDF:', error);
        res.status(500).json({ error: 'Error downloading resume', details: error.message });
    }
});

// Add new endpoint to view the TED format resume
router.get('/:id/view', async (req, res) => {
    try {
        const resume = await Resume.findOne({ 
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        
        if (!resume.tedPath) {
            // If TED format doesn't exist yet, generate it now
            try {
                const resumeData = {
                    personalInfo: resume.personalInfo,
                    education: resume.education,
                    experience: resume.experience,
                    skills: resume.skills,
                    projects: resume.projects,
                    summary: resume.summary
                };
                
                const tedPath = await generateTEDResume(resumeData, resume._id);
                
                // Update resume with TED path
                resume.tedPath = tedPath;
                resume.tedUrl = `/static/resumes/${resume._id}.html`;
                await resume.save();
                
                logger.info(`TED resume generated on-demand for resume ID: ${resume._id}`);
            } catch (tedError) {
                logger.error('Error generating TED resume on-demand:', tedError);
                return res.status(500).json({ error: 'Error generating resume preview' });
            }
        }
        
        // Send the TED HTML file
        res.sendFile(resume.tedPath);
    } catch (error) {
        logger.error('Error viewing resume:', error);
        res.status(500).json({ error: 'Error viewing resume', details: error.message });
    }
});

export default router;