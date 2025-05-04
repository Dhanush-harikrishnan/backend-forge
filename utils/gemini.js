import axios from 'axios';
import { logger } from './logger.js';

// Use the API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate content using the Gemini API
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} model - The model to use (defaults to gemini-1.5-flash)
 * @returns {Promise<string>} - The generated text
 */
const generateContent = async (prompt, model = 'gemini-1.5-flash') => {
  try {
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    const response = await axios.post(
      `${API_URL}/${model}:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the text from the response
    if (response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    // Log error without circular references
    const cleanError = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
    logger.error('Error generating content with Gemini:', cleanError);
    throw new Error(`Gemini API error: ${error.message}`);
  }
};

/**
 * Generate resume content from user profile data
 * @param {Object} profile - User profile data
 * @returns {Object} Generated resume content
 */
export const generateResume = async (profile = {}) => {
  try {
    // Ensure we have default values if profile data is missing
    const name = profile.name || 'John Doe';
    const email = profile.email || 'example@email.com';
    const skills = Array.isArray(profile.skills) && profile.skills.length > 0 
      ? profile.skills.join(', ') 
      : 'Web Development, JavaScript, React';
    const bio = profile.bio || 'Experienced developer with a passion for technology';
    
    // Create a structured prompt for the resume
    const prompt = `Generate a professional resume for a person with the following profile:
    
    Full Name: ${name}
    Email: ${email}
    Skills: ${skills}
    Bio: ${bio}
    
    For each skill, suggest relevant experience entries with:
    1. Company name
    2. Position title
    3. Start and end dates
    4. Bulleted descriptions of responsibilities and achievements (3-5 bullets)
    
    Also generate:
    1. A professional summary paragraph
    2. Education section with 1-2 entries
    3. Projects section with 2-3 projects that showcase the skills
    
    Format the response as a valid JSON object with the following structure:
    {
      "summary": "Professional summary...",
      "experience": [
        {
          "company": "Company name",
          "position": "Position title",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM or present",
          "description": "Job description...",
          "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]
        }
      ],
      "education": [
        {
          "institution": "University name",
          "degree": "Degree title",
          "field": "Field of study",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM",
          "gpa": "3.8/4.0"
        }
      ],
      "projects": [
        {
          "title": "Project title",
          "description": "Project description",
          "technologies": ["Tech1", "Tech2"],
          "url": "https://project-url.com",
          "github": "https://github.com/username/project"
        }
      ]
    }

    IMPORTANT: The response must be a valid, parseable JSON object exactly matching this structure.`;

    // Check if API key is available
    if (!API_KEY) {
      logger.warn('GEMINI_API_KEY is not set, using default resume template');
      return getDefaultResume(profile);
    }

    const responseText = await generateContent(prompt);
    
    // Extract the JSON part from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                      responseText.match(/```\n([\s\S]*)\n```/) || 
                      [null, responseText];
    
    const jsonText = jsonMatch[1]?.trim() || responseText.trim();
    
    // Parse the JSON response from the text
    try {
      const resumeData = JSON.parse(jsonText);
      return resumeData;
    } catch (parseError) {
      logger.error('JSON parse error:', parseError, 'Raw text:', jsonText);
      // Try to find any JSON-like structure in the response as a fallback
      const possibleJson = responseText.match(/\{[\s\S]*\}/);
      if (possibleJson) {
        try {
          return JSON.parse(possibleJson[0]);
        } catch (error) {
          logger.error('Second JSON parse error:', error);
          return getDefaultResume(profile);
        }
      }
      
      // If we couldn't parse the response, return a default template
      return getDefaultResume(profile);
    }
  } catch (error) {
    logger.error('Error generating resume with Gemini:', error);
    // Return default resume instead of throwing
    return getDefaultResume(profile);
  }
};

/**
 * Creates a default resume when the API call fails
 * @param {Object} profile - User profile data
 * @returns {Object} Default resume template
 */
function getDefaultResume(profile = {}) {
  const name = profile.name || 'John Doe';
  const email = profile.email || 'example@email.com';
  const skillsArray = Array.isArray(profile.skills) && profile.skills.length > 0 
    ? profile.skills 
    : ['JavaScript', 'React', 'Node.js', 'HTML/CSS'];
  
  return {
    summary: `Experienced professional with skills in ${skillsArray.slice(0, 3).join(', ')}. Committed to delivering high-quality results and continuously improving technical capabilities. Seeking opportunities to apply expertise in challenging projects.`,
    experience: [
      {
        company: "Tech Solutions Inc.",
        position: "Senior Developer",
        startDate: "2020-01",
        endDate: "Present",
        description: "Lead developer for web applications and services",
        bullets: [
          "Developed and maintained multiple web applications using modern frameworks",
          "Collaborated with cross-functional teams to deliver projects on schedule",
          "Implemented best practices for code quality and performance optimization"
        ]
      },
      {
        company: "Digital Innovations LLC",
        position: "Web Developer",
        startDate: "2017-06",
        endDate: "2019-12",
        description: "Full-stack development for client projects",
        bullets: [
          "Built responsive websites and applications for diverse clients",
          "Worked with agile development methodologies to meet project milestones",
          "Maintained and enhanced existing codebases to improve functionality"
        ]
      }
    ],
    education: [
      {
        institution: "University of Technology",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2013-09",
        endDate: "2017-05",
        gpa: "3.7/4.0"
      }
    ],
    projects: [
      {
        title: "E-commerce Platform",
        description: "A full-featured online shopping platform with user authentication, product catalog, and payment processing",
        technologies: skillsArray.slice(0, 4),
        url: "https://project-example.com",
        github: "https://github.com/username/ecommerce"
      },
      {
        title: "Task Management System",
        description: "A productivity application allowing users to create, organize, and track tasks and projects",
        technologies: skillsArray.slice(0, 3),
        url: "https://tasks-example.com",
        github: "https://github.com/username/tasks"
      }
    ]
  };
}

/**
 * Generate project ideas based on skills and interests
 * @param {Object} params - Parameters for project generation
 * @returns {Array} List of project ideas
 */
export const generateProjects = async (params = {}) => {
  try {
    const { skills = [], interests = [], experience = 'intermediate' } = params;
    
    const skillsList = Array.isArray(skills) && skills.length > 0 
      ? skills.join(', ') 
      : 'JavaScript, React, Node.js';
    
    const interestsList = Array.isArray(interests) && interests.length > 0
      ? interests.join(', ')
      : 'Web Development';
    
    // Enhanced prompt with more specific instructions for personalization
    const prompt = `Generate 5 UNIQUE and HIGHLY PERSONALIZED project ideas for a ${experience} developer with the following profile:
    Skills: ${skillsList}
    Interests: ${interestsList}
    
    IMPORTANT REQUIREMENTS:
    1. Each project MUST directly utilize the specific skills listed above
    2. Projects should align with the stated interests
    3. NO generic projects - each must be tailored to the exact skills and interests
    4. Vary the complexity and scope across the 5 projects
    5. Include at least one innovative or cutting-edge project idea
    6. Suggest projects that would stand out in a portfolio
    
    For each project, provide:
    1. Project title (creative and specific)
    2. Detailed description (3-4 sentences explaining the concept, features, and uniqueness)
    3. Key technologies to use (list of 3-6 specific technologies from the skills list)
    4. Learning outcomes (4-5 specific skills that will be gained)
    5. Estimated completion time
    
    Format the response as a JSON array with the following structure:
    [
      {
        "title": "Project title",
        "description": "Detailed description...",
        "technologies": ["Tech1", "Tech2", "Tech3", "Tech4"],
        "learningOutcomes": ["Outcome1", "Outcome2", "Outcome3", "Outcome4"],
        "estimatedTime": "X weeks/months"
      }
    ]
    
    IMPORTANT: The response must be a valid, parseable JSON array exactly matching this structure. Each project must be completely different from the others and specifically tailored to the skills and interests provided.`;

    const responseText = await generateContent(prompt);
    
    // Extract the JSON part from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                      responseText.match(/```\n([\s\S]*)\n```/) || 
                      [null, responseText];
    
    const jsonText = jsonMatch[1]?.trim() || responseText.trim();
    
    // Parse the JSON response from the text
    try {
      const projectIdeas = JSON.parse(jsonText);
      return projectIdeas;
    } catch (parseError) {
      logger.error('JSON parse error:', parseError, 'Raw text:', jsonText);
      // Try to find any JSON-like structure in the response as a fallback
      const possibleJson = responseText.match(/\[[\s\S]*\]/);
      if (possibleJson) {
        return JSON.parse(possibleJson[0]);
      }
      
      // Return default project ideas if parsing fails
      return getDefaultProjectIdeas(skillsList, interestsList);
    }
  } catch (error) {
    logger.error('Error generating projects with Gemini:', error);
    // Return default project ideas in case of API error
    const fallbackSkills = Array.isArray(params.skills) && params.skills.length > 0 
      ? params.skills.join(', ') 
      : 'JavaScript, React, Node.js';
    
    const fallbackInterests = Array.isArray(params.interests) && params.interests.length > 0
      ? params.interests.join(', ')
      : 'Web Development';
      
    return getDefaultProjectIdeas(fallbackSkills, fallbackInterests);
  }
};

// Helper function to create default project ideas when API fails
function getDefaultProjectIdeas(skills = "JavaScript, React, Node.js", interests = "Web Development") {
  // Parse the skills and interests to create more tailored defaults
  const skillsArray = skills.split(',').map(s => s.trim());
  const interestsArray = interests.split(',').map(i => i.trim());
  
  // Extract some key technologies to use in the projects
  const frontendTechs = skillsArray.filter(s => 
    ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind', 'Bootstrap'].some(tech => 
      s.toLowerCase().includes(tech.toLowerCase())
    )
  );
  
  const backendTechs = skillsArray.filter(s => 
    ['Node', 'Express', 'Django', 'Flask', 'PHP', 'Laravel', 'Spring', 'Java', 'Python', '.NET', 'C#'].some(tech => 
      s.toLowerCase().includes(tech.toLowerCase())
    )
  );
  
  const databaseTechs = skillsArray.filter(s => 
    ['SQL', 'Postgres', 'MySQL', 'MongoDB', 'Firebase', 'Supabase', 'DynamoDB'].some(tech => 
      s.toLowerCase().includes(tech.toLowerCase())
    )
  );
  
  // Create a diverse set of project ideas
  return [
    {
      "title": "Interactive Portfolio & Project Showcase",
      "description": "A dynamic portfolio website with interactive project showcases, skill visualizations, and a blog section. Implement modern animations, dark/light mode, and a contact form with validation.",
      "technologies": frontendTechs.length > 0 ? frontendTechs.slice(0, 3) : ["React", "Tailwind CSS", "Framer Motion"],
      "learningOutcomes": ["Advanced UI/UX design", "Animation techniques", "Responsive layouts", "Performance optimization", "SEO best practices"],
      "estimatedTime": "3-4 weeks"
    },
    {
      "title": "AI-Enhanced Productivity Dashboard",
      "description": "A comprehensive productivity system with task management, time tracking, and AI-powered insights. Features include priority suggestions, productivity analytics, and integration with calendar services.",
      "technologies": [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1)].filter(Boolean).length > 0 ? 
        [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1)].filter(Boolean) : 
        ["React", "Node.js", "MongoDB", "Express", "Chart.js"],
      "learningOutcomes": ["Full-stack architecture", "Data visualization", "AI integration", "State management", "User authentication"],
      "estimatedTime": "2-3 months"
    },
    {
      "title": "Community-Driven Learning Platform",
      "description": "A platform where users can create, share, and follow learning paths on various topics. Includes features like progress tracking, resource recommendations, and community discussions with upvoting system.",
      "technologies": [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1)].filter(Boolean).length > 0 ? 
        [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1)].filter(Boolean) : 
        ["React", "Redux", "Node.js", "PostgreSQL", "Firebase Auth"],
      "learningOutcomes": ["Complex database relationships", "User-generated content management", "Community features", "Recommendation algorithms", "Content moderation"],
      "estimatedTime": "3-4 months"
    },
    {
      "title": "Real-time Collaborative Workspace",
      "description": "A collaborative workspace application with real-time document editing, video conferencing, and project management tools. Support for team chat, file sharing, and integration with popular productivity tools.",
      "technologies": [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), "Socket.io", "WebRTC"].filter(Boolean).length > 0 ? 
        [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), "Socket.io", "WebRTC"].filter(Boolean) : 
        ["React", "Socket.io", "Express", "MongoDB", "WebRTC"],
      "learningOutcomes": ["Real-time data synchronization", "WebRTC implementation", "Collaborative editing algorithms", "Scalable architecture", "Security best practices"],
      "estimatedTime": "3-5 months"
    },
    {
      "title": "Personalized Health & Fitness Tracker",
      "description": "A comprehensive health tracking application with customizable workout plans, nutrition logging, and progress visualization. Includes goal setting, achievement badges, and AI-powered recommendations.",
      "technologies": [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1), "Chart.js"].filter(Boolean).length > 0 ? 
        [...frontendTechs.slice(0, 2), ...backendTechs.slice(0, 2), ...databaseTechs.slice(0, 1), "Chart.js"].filter(Boolean) : 
        ["React Native", "Node.js", "MongoDB", "Express", "Chart.js", "TensorFlow.js"],
      "learningOutcomes": ["Mobile-first design", "Health data visualization", "Personalization algorithms", "Gamification techniques", "Local storage optimization"],
      "estimatedTime": "2-3 months"
    }
  ];
}

/**
 * Generate a detailed learning roadmap for a technology
 * @param {Object} params - Parameters for roadmap generation
 * @returns {Object} Detailed learning roadmap
 */
export const generateTechRoadmap = async (params = {}) => {
  try {
    const { technology = 'Web Development', goalLevel = 'intermediate', timeframe = '3 months' } = params;
    
    // Check if technology parameter exists
    if (!technology) {
      logger.warn('Technology parameter is missing, using default');
      return createDefaultRoadmap('Web Development', goalLevel, timeframe);
    }
    
    const prompt = `Create a detailed learning roadmap for mastering ${technology} in ${timeframe} to reach ${goalLevel} level.
    
    Include:
    1. A week-by-week breakdown
    2. Specific resources to learn from (courses, documentation, books)
    3. Practice projects to build at each stage
    4. Milestones and checkpoints to evaluate progress
    
    Format the response as a JSON object with the following structure:
    {
      "overview": "Brief overview of the learning path",
      "prerequisites": ["Prereq1", "Prereq2"],
      "weeks": [
        {
          "week": 1,
          "focus": "Getting started with...",
          "resources": [
            {"type": "course", "title": "Resource title", "url": "https://example.com"},
            {"type": "documentation", "title": "Resource title", "url": "https://example.com"}
          ],
          "projects": [
            {"title": "Project title", "description": "Brief description..."}
          ],
          "milestones": ["Milestone1", "Milestone2"]
        }
      ],
      "advancedTopics": ["Topic1", "Topic2"]
    }
    
    IMPORTANT: 
    1. The response must be a valid, parseable JSON object exactly matching this structure.
    2. Do not include any additional text before or after the JSON.
    3. Ensure all quotes and braces are properly balanced.
    4. All URLs should be valid (use placeholder URLs like example.com if needed).
    5. Do not use special characters that would break JSON parsing.`;

    const responseText = await generateContent(prompt);
    
    // Extract the JSON part from the response
    let jsonText = '';
    
    // Try to find JSON between code blocks first
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim();
    } else {
      // Look for an object pattern if no code blocks found
      const objectMatch = responseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0].trim();
      } else {
        // If all else fails, try the entire response
        jsonText = responseText.trim();
      }
    }
    
    // Log the extracted JSON text for debugging
    logger.debug(`Extracted JSON text from Gemini (first 100 chars): ${jsonText.substring(0, 100)}...`);
    
    // Try different approaches to parse the JSON
    try {
      // Attempt to parse the extracted JSON directly
      return JSON.parse(jsonText);
    } catch (parseError) {
      logger.warn(`Initial JSON parse error: ${parseError.message}`);
      
      try {
        // Try to fix common JSON syntax errors
        const fixedJson = jsonText
          // Fix trailing commas in arrays or objects
          .replace(/,(\s*[\]}])/g, '$1')
          // Fix missing quotes around property names
          .replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":')
          // Replace single quotes with double quotes
          .replace(/'/g, '"');
        
        return JSON.parse(fixedJson);
      } catch (secondError) {
        logger.error(`JSON parse error after fixing common issues: ${secondError.message}`);
        
        // As a last resort, create default roadmap structure
        return createDefaultRoadmap(technology, goalLevel, timeframe);
      }
    }
  } catch (error) {
    logger.error(`Error generating tech roadmap with Gemini: ${error.message}`);
    // Return default roadmap as fallback
    const tech = params && params.technology ? params.technology : 'Web Development';
    const goal = params && params.goalLevel ? params.goalLevel : 'intermediate';
    const time = params && params.timeframe ? params.timeframe : '3 months';
    return createDefaultRoadmap(tech, goal, time);
  }
};

/**
 * Create a default roadmap structure when API response parsing fails
 * @param {string} technology - The technology to create a roadmap for
 * @param {string} goalLevel - The target skill level
 * @param {string} timeframe - The learning timeframe
 * @returns {Object} A default roadmap structure
 */
function createDefaultRoadmap(technology = 'Programming', goalLevel = 'intermediate', timeframe = '3 months') {
  const weeks = [];
  const totalWeeks = timeframe.includes('1 month') ? 4 : 
                    timeframe.includes('6 months') ? 24 : 12; // Default to 3 months (12 weeks)
  
  // Create a default structure with basic placeholders
  for (let i = 1; i <= Math.min(totalWeeks, 12); i++) { // Cap at 12 weeks max
    weeks.push({
      week: i,
      focus: i <= 4 ? "Fundamentals" : i <= 8 ? "Intermediate concepts" : "Advanced topics",
      resources: [
        {
          type: "documentation",
          title: `${technology} Documentation`,
          url: `https://example.com/${technology.toLowerCase()}/docs`
        },
        {
          type: "tutorial",
          title: `${technology} Tutorial - Week ${i}`,
          url: `https://example.com/${technology.toLowerCase()}/tutorial`
        }
      ],
      projects: [
        {
          title: `Practice Project ${i}`,
          description: `A simple project to practice ${technology} concepts from week ${i}`
        }
      ],
      milestones: [
        `Understand key concepts from week ${i}`,
        `Complete the practice project`
      ]
    });
  }
  
  return {
    overview: `A learning roadmap for ${technology} to reach ${goalLevel} level in ${timeframe}.`,
    prerequisites: ["Basic programming knowledge", "Familiarity with development tools"],
    weeks: weeks,
    advancedTopics: [
      `Advanced ${technology} patterns`,
      "Performance optimization",
      "Best practices"
    ]
  };
}

export default {
  generateResume,
  generateProjects,
  generateTechRoadmap
};
