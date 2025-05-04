import { logger } from '../utils/logger.js';
import { generateProjects } from '../utils/gemini.js';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Helper function to call Gemini API
async function callGeminiApi(prompt, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      {
        params: { key: apiKey },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Validate response structure
    if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const candidate = response.data.candidates[0];
    
    // Check for content blocks
    if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      throw new Error('No content parts found in Gemini API response');
    }

    // Return only the text part to avoid circular references
    return candidate.content.parts[0].text;
  } catch (error) {
    // Extract essential error information to avoid circular references
    const errorInfo = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      apiError: error.response?.data?.error || null
    };
    
    logger.error(`Gemini API call failed: ${errorInfo.message}`, { errorDetails: errorInfo });
    throw new Error(`API request failed: ${errorInfo.message}`);
  }
}

export const generateProjectIdeas = async (req, res) => {
  try {
    const { skills, interests, experience } = req.body;
    
    // Generate project ideas using Gemini utility function
    const projectIdeas = await generateProjects({
      skills,
      interests,
      experience
    });

    res.json({ projectIdeas });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    logger.error(`Error generating project ideas: ${errorMessage}`);
    res.status(500).json({ message: 'Error generating project ideas' });
  }
};

export const analyzeResume = async (req, res) => {
  try {
    const { resumeText } = req.body;
    
    const prompt = `Analyze this resume and provide detailed feedback:
    ${resumeText}
    
    Please provide:
    1. Strengths
    2. Areas for improvement
    3. Missing key skills
    4. Formatting suggestions
    5. Action items to enhance the resume`;

    const analysis = await callGeminiApi(prompt, GEMINI_API_KEY);
    res.json({ analysis });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    logger.error(`Error analyzing resume: ${errorMessage}`);
    res.status(500).json({ message: 'Error analyzing resume' });
  }
};

export const getCareerRecommendations = async (req, res) => {
  try {
    const { skills, experience, interests, currentRole } = req.body;
    
    const prompt = `Provide career recommendations for a professional with:
    Current Role: ${currentRole}
    Skills: ${skills.join(', ')}
    Experience: ${experience}
    Interests: ${interests.join(', ')}
    
    Please provide:
    1. Potential career paths
    2. Required skills for each path
    3. Learning resources
    4. Timeline for transition
    5. Salary expectations
    6. Job market outlook`;

    const recommendations = await callGeminiApi(prompt, GEMINI_API_KEY);
    res.json({ recommendations });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    logger.error(`Error getting career recommendations: ${errorMessage}`);
    res.status(500).json({ message: 'Error getting career recommendations' });
  }
};

export const generateProjectRoadmap = async (req, res) => {
  try {
    const { projectTitle, description, skills, timeline } = req.body;
    
    if (!projectTitle || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project title and description are required' 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY environment variable is not set');
      return res.status(500).json({
        success: false,
        message: 'API configuration error. Please contact the administrator.'
      });
    }
    
    const prompt = constructRoadmapPrompt(projectTitle, description, skills, timeline);
    
    // Call API with better error handling
    let roadmapText;
    try {
      roadmapText = await callGeminiApi(prompt, apiKey);
      if (!roadmapText || roadmapText.trim() === '') {
        throw new Error('Empty response received from Gemini API');
      }
      logger.info(`Successfully received response for project: ${projectTitle}`);
    } catch (error) {
      logger.error(`Failed to generate roadmap: ${error.message}`);
      
      // Create default roadmap items in case of API failure
      const roadmapItems = createDefaultRoadmap(projectTitle);
      const overview = `Roadmap for ${projectTitle}`;
      
      // Return default roadmap with warning
      return res.status(200).json({
        success: true,
        roadmapOverview: overview,
        roadmapItems: roadmapItems.map(item => {
          // Format dates
          let dueDate;
          try {
            dueDate = item.dueDate instanceof Date 
              ? item.dueDate.toISOString() 
              : new Date(item.dueDate).toISOString();
          } catch (e) {
            dueDate = new Date().toISOString();
          }
          
          return {
            name: String(item.name || '').substring(0, 100),
            description: String(item.description || '').substring(0, 500),
            category: ['milestone', 'task'].includes(item.category) ? item.category : 'task',
            dueDate: dueDate,
            completed: Boolean(item.completed)
          };
        }),
        warning: 'Generated using default template due to API issues'
      });
    }
    
    // Parse roadmap text with error handling
    let roadmapItems = [];
    let overview = '';
    
    try {
      roadmapItems = parseRoadmapText(roadmapText, timeline);
      overview = extractOverview(roadmapText);
      
      // If no valid roadmap items were parsed, throw an error
      if (!roadmapItems || roadmapItems.length === 0) {
        throw new Error('Failed to parse roadmap items from API response');
      }
    } catch (error) {
      logger.error(`Failed to parse roadmap: ${error.message}`);
      
      // Create default roadmap items in case of parsing failure
      roadmapItems = createDefaultRoadmap(projectTitle);
      overview = `Roadmap for ${projectTitle}`;
    }

    // Format the response for cleaner JSON
    const responseData = {
      success: true,
      roadmapOverview: overview,
      roadmapItems: roadmapItems.map(item => {
        // Ensure the date is properly formatted
        let dueDate;
        try {
          dueDate = item.dueDate instanceof Date 
            ? item.dueDate.toISOString() 
            : new Date(item.dueDate).toISOString();
        } catch (e) {
          // Fallback to current date if date parsing fails
          dueDate = new Date().toISOString();
          logger.warn(`Failed to parse date: ${item.dueDate}, using current date instead`);
        }
        
        return {
          name: String(item.name || '').substring(0, 100), // Truncate if too long
          description: String(item.description || '').substring(0, 500), // Truncate if too long
          category: ['milestone', 'task'].includes(item.category) ? item.category : 'task',
          dueDate: dueDate,
          completed: Boolean(item.completed)
        };
      })
    };

    return res.status(200).json(responseData);
  } catch (error) {
    logger.error(`Error in generateProjectRoadmap: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating project roadmap. Please try again later.' 
    });
  }
};

// Helper function to parse the roadmap text and extract structured items
function parseRoadmapText(text, timeline) {
  try {
    const items = [];
    const timeMultiplier = getTimelineMultiplier(timeline || '3 months');
    const MAX_ITEMS = 24; // Maximum allowed roadmap items (increased from 20)
    
    // Safety check for empty or invalid text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      logger.warn("Empty or invalid roadmap text received, using default roadmap structure");
      return createDefaultRoadmap(timeline);
    }
    
    // Calculate timeline in weeks
    let totalWeeks = 12; // Default to 3 months
    if (timeline) {
      if (timeline.includes('1 month')) totalWeeks = 4;
      if (timeline.includes('3 months')) totalWeeks = 12;
      if (timeline.includes('6 months')) totalWeeks = 24;
    }
    
    // Look for the structured phases we requested in the prompt
    const phasePatterns = [
      { name: "Planning & Setup Phase", weekRange: [1, Math.max(1, Math.floor(totalWeeks * 0.15))] },
      { name: "Core Development Phase", weekRange: [Math.max(2, Math.floor(totalWeeks * 0.15) + 1), Math.max(4, Math.floor(totalWeeks * 0.5))] },
      { name: "Feature Implementation Phase", weekRange: [Math.max(5, Math.floor(totalWeeks * 0.5) + 1), Math.max(8, Math.floor(totalWeeks * 0.8))] },
      { name: "Testing & Refinement Phase", weekRange: [Math.max(9, Math.floor(totalWeeks * 0.8) + 1), totalWeeks] }
    ];
    
    // First, try to find the exact phase headers we specified in the prompt
    const phaseRegexes = [
      /Planning\s*&\s*Setup\s*Phase/i,
      /Core\s*Development\s*Phase/i,
      /Feature\s*Implementation\s*Phase/i,
      /Testing\s*&\s*Refinement\s*Phase/i
    ];
    
    let phaseMatches = [];
    let phaseStartIndices = [];
    
    // Find all phase headers and their positions in the text
    phaseRegexes.forEach((regex, index) => {
      const match = text.match(regex);
      if (match) {
        phaseMatches.push({
          index: match.index,
          name: phasePatterns[index].name,
          weekRange: phasePatterns[index].weekRange
        });
        phaseStartIndices.push(match.index);
      }
    });
    
    // Sort phases by their position in the text
    phaseMatches.sort((a, b) => a.index - b.index);
    phaseStartIndices.sort((a, b) => a - b);
    
    // If we didn't find our exact phases, fall back to a more general approach
    if (phaseMatches.length < 2) {
      // Look for any phase-like headers
      const generalPhaseRegex = /(?:Phase|Milestone|Stage)?\s*\d*\s*:?\s*([^:\n]+)(?:\(Week \d+(?:-\d+)?\))?/gi;
      const generalMatches = Array.from(text.matchAll(generalPhaseRegex));
      
      if (generalMatches.length >= 2) {
        // Use these general phases instead
        phaseMatches = generalMatches.slice(0, 4).map((match, index) => {
          const phaseName = match[1]?.trim() || phasePatterns[Math.min(index, 3)].name;
          return {
            index: match.index,
            name: phaseName,
            weekRange: phasePatterns[Math.min(index, 3)].weekRange
          };
        });
        
        phaseStartIndices = phaseMatches.map(match => match.index);
      } else {
        // If we still can't find phases, use our predefined ones
        logger.warn("Could not find phase headers in the response, using default phases");
        phaseMatches = phasePatterns.map((phase, index) => ({
          index: index * 500, // Just a placeholder
          name: phase.name,
          weekRange: phase.weekRange
        }));
      }
    }
    
    // Process each phase to extract tasks
    let currentDay = 0;
    
    for (let i = 0; i < phaseMatches.length; i++) {
      const phase = phaseMatches[i];
      const phaseStartIndex = phase.index;
      const phaseEndIndex = i < phaseMatches.length - 1 ? phaseMatches[i + 1].index : text.length;
      const phaseContent = text.substring(phaseStartIndex, phaseEndIndex);
      
      // Calculate the middle day for this phase based on week range
      const phaseStartWeek = phase.weekRange[0];
      const phaseEndWeek = phase.weekRange[1];
      const phaseMidDay = Math.floor(((phaseStartWeek + phaseEndWeek) / 2) * 7);
      
      // Add the phase as a milestone
      items.push({
        name: phase.name,
        description: `Milestone for ${phase.name} (Weeks ${phase.weekRange[0]}-${phase.weekRange[1]})`,
        category: 'milestone',
        dueDate: new Date(Date.now() + (phaseMidDay * 24 * 60 * 60 * 1000)),
        completed: false
      });
      
      // Look for tasks in bullet points, numbered lists, or task-like entries
      const taskRegexes = [
        /[-*•]?\s*(?:\d+\.\s+)?([^:\n.]+)[:.]\s*([^\n]*)/g, // Format: "Task name: description"
        /[-*•]?\s*(?:\d+\.\s+)?([^(]+)\s*\(([^)]+)\)/g,     // Format: "Task name (description)"
        /[-*•]?\s*(?:\d+\.\s+)?([^\n.]+)(?:\.\s+([^\n]*))?/g // Format: "Task name. description"
      ];
      
      let taskMatches = [];
      
      // Try each regex pattern to find tasks
      for (const regex of taskRegexes) {
        const matches = Array.from(phaseContent.matchAll(regex));
        if (matches.length > 0) {
          taskMatches = matches;
          break;
        }
      }
      
      // If we found tasks, process them
      if (taskMatches.length > 0) {
        // Limit to 5 tasks per phase
        const limitedTaskMatches = taskMatches.slice(0, 5);
        
        for (const taskMatch of limitedTaskMatches) {
          const taskName = taskMatch[1]?.trim();
          const taskDesc = taskMatch[2]?.trim() || '';
          
          if (taskName && taskName.length > 2 && 
              !taskName.toLowerCase().includes('phase') && 
              !taskName.toLowerCase().includes('milestone')) {
            
            // Calculate a due date within the phase's week range
            const taskPosition = limitedTaskMatches.indexOf(taskMatch) / limitedTaskMatches.length;
            const taskWeek = Math.floor(phase.weekRange[0] + taskPosition * (phase.weekRange[1] - phase.weekRange[0]));
            const taskDay = taskWeek * 7;
            
            items.push({
              name: taskName.length > 50 ? taskName.substring(0, 50) + '...' : taskName,
              description: taskDesc ? (taskDesc.length > 200 ? taskDesc.substring(0, 200) + '...' : taskDesc) : '',
              category: 'task',
              dueDate: new Date(Date.now() + (taskDay * 24 * 60 * 60 * 1000)),
              completed: false
            });
            
            // Check if we've reached the maximum number of items
            if (items.length >= MAX_ITEMS) {
              break;
            }
          }
        }
      } else {
        // If no tasks found for this phase, add some default ones
        const defaultTasks = getDefaultTasksForPhase(phase.name, phase.weekRange);
        for (const task of defaultTasks) {
          items.push({
            ...task,
            dueDate: new Date(Date.now() + (task.day * 24 * 60 * 60 * 1000)),
            completed: false
          });
          
          if (items.length >= MAX_ITEMS) {
            break;
          }
        }
      }
    }
    
    // If no items were found with regex (AI output varies), create some default items
    if (items.length === 0) {
      logger.info("No roadmap items extracted from AI response, using default structure");
      return createDefaultRoadmap(timeline);
    }
    
    // If we have too few items, supplement with defaults
    if (items.length < 8) {
      logger.info("Too few roadmap items extracted, using default structure");
      return createDefaultRoadmap(timeline);
    }
    
    return items;
  } catch (error) {
    logger.error(`Error parsing roadmap text: ${error.message}`);
    return createDefaultRoadmap(timeline);
  }
}

// Helper function to get default tasks for a specific phase
function getDefaultTasksForPhase(phaseName, weekRange) {
  const phaseStartDay = weekRange[0] * 7;
  const phaseEndDay = weekRange[1] * 7;
  const phaseDuration = phaseEndDay - phaseStartDay;
  
  // Calculate days for tasks to be evenly distributed
  const taskDays = [
    Math.floor(phaseStartDay + phaseDuration * 0.2),
    Math.floor(phaseStartDay + phaseDuration * 0.4),
    Math.floor(phaseStartDay + phaseDuration * 0.6),
    Math.floor(phaseStartDay + phaseDuration * 0.8)
  ];
  
  if (phaseName.includes("Planning")) {
    return [
      { name: "Define project requirements", description: "Document detailed functional and non-functional requirements", category: "task", day: taskDays[0] },
      { name: "Create project architecture", description: "Design system architecture and component interactions", category: "task", day: taskDays[1] },
      { name: "Set up development environment", description: "Install and configure necessary tools and frameworks", category: "task", day: taskDays[2] },
      { name: "Create initial project structure", description: "Set up repository and basic project scaffolding", category: "task", day: taskDays[3] }
    ];
  } else if (phaseName.includes("Core Development")) {
    return [
      { name: "Implement core functionality", description: "Develop the main features of the application", category: "task", day: taskDays[0] },
      { name: "Create database schema", description: "Design and implement database models and relationships", category: "task", day: taskDays[1] },
      { name: "Develop API endpoints", description: "Create backend services and API endpoints", category: "task", day: taskDays[2] },
      { name: "Implement authentication", description: "Add user authentication and authorization", category: "task", day: taskDays[3] }
    ];
  } else if (phaseName.includes("Feature")) {
    return [
      { name: "Implement user interface", description: "Create responsive UI components and layouts", category: "task", day: taskDays[0] },
      { name: "Add advanced features", description: "Implement additional functionality beyond core requirements", category: "task", day: taskDays[1] },
      { name: "Integrate third-party services", description: "Connect with external APIs and services", category: "task", day: taskDays[2] },
      { name: "Implement data visualization", description: "Add charts, graphs, or other data visualization components", category: "task", day: taskDays[3] }
    ];
  } else if (phaseName.includes("Testing")) {
    return [
      { name: "Write unit tests", description: "Create comprehensive test suite for components", category: "task", day: taskDays[0] },
      { name: "Perform integration testing", description: "Test interactions between different parts of the application", category: "task", day: taskDays[1] },
      { name: "Conduct user acceptance testing", description: "Validate application meets user requirements", category: "task", day: taskDays[2] },
      { name: "Fix bugs and optimize performance", description: "Address issues and improve application performance", category: "task", day: taskDays[3] }
    ];
  } else {
    return [
      { name: "Task 1", description: "First task for this phase", category: "task", day: taskDays[0] },
      { name: "Task 2", description: "Second task for this phase", category: "task", day: taskDays[1] },
      { name: "Task 3", description: "Third task for this phase", category: "task", day: taskDays[2] },
      { name: "Task 4", description: "Fourth task for this phase", category: "task", day: taskDays[3] }
    ];
  }
}

// Helper function to create default roadmap in case of parsing failure
function createDefaultRoadmap(projectTitle, timeline = "3 months") {
  const timelineDays = getTimelineDays(timeline);
  const currentDate = new Date();
  const title = projectTitle || "Project";
  
  const items = [];
  let currentDay = 0;
  
  // Planning phase
  items.push({
    name: "Planning Phase",
    description: `Initial ${title} planning and preparation`,
    category: "milestone",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Planning tasks
  currentDay += 3;
  items.push({
    name: "Define project requirements",
    description: `Gather and document all ${title} requirements`,
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 4;
  items.push({
    name: "Research technical solutions",
    description: "Evaluate technologies and frameworks for implementation",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 5;
  items.push({
    name: "Design system architecture",
    description: "Create technical specifications and system architecture",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Development phase
  currentDay += 5; // Buffer between phases
  items.push({
    name: "Development Phase",
    description: "Core development activities",
    category: "milestone",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Development tasks
  currentDay += 2;
  items.push({
    name: "Set up development environment",
    description: "Configure development tools and environments",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 14;
  items.push({
    name: "Implement core features",
    description: "Develop the main functionality of the application",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 7;
  items.push({
    name: "Create user interface",
    description: "Design and implement the user interface",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Testing phase
  currentDay += 5; // Buffer between phases
  items.push({
    name: "Testing Phase",
    description: "Quality assurance and testing activities",
    category: "milestone",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Testing tasks
  currentDay += 5;
  items.push({
    name: "Write unit tests",
    description: "Create automated tests for individual components",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 4;
  items.push({
    name: "Perform integration testing",
    description: "Test interactions between components",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 6;
  items.push({
    name: "Fix identified bugs",
    description: "Address and resolve issues found during testing",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Deployment phase
  currentDay += 5; // Buffer between phases
  items.push({
    name: "Deployment Phase",
    description: "Launch and post-launch activities",
    category: "milestone",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  // Deployment tasks
  currentDay += 3;
  items.push({
    name: "Prepare deployment environment",
    description: "Set up servers and deployment infrastructure",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 2;
  items.push({
    name: "Deploy application",
    description: "Release the application to production",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  currentDay += 4;
  items.push({
    name: "Monitor performance",
    description: "Track application performance and user feedback",
    category: "task",
    dueDate: new Date(currentDate.getTime() + (currentDay * 24 * 60 * 60 * 1000)),
    completed: false
  });
  
  return items;
}

function extractOverview(text) {
  // Get the first paragraph as an overview
  const firstParagraph = text.split('\n\n')[0];
  return firstParagraph || 'Project roadmap with phases and tasks to track progress.';
}

function getTimelineMultiplier(timeline) {
  // Convert timeline string to a multiplier
  if (timeline.includes('1 month')) return 1;
  if (timeline.includes('3 months')) return 3;
  if (timeline.includes('6 months')) return 6;
  return 3; // Default to 3 months
}

function getTimelineDays(timeline) {
  // Convert timeline string to approximate days
  if (timeline.includes('1 month')) return 30;
  if (timeline.includes('3 months')) return 90;
  if (timeline.includes('6 months')) return 180;
  return 90; // Default to 3 months
}

// Helper function to construct the roadmap prompt
function constructRoadmapPrompt(projectTitle, description, skills, timeline) {
  const skillsList = Array.isArray(skills) && skills.length > 0 
    ? skills.join(', ') 
    : 'Not specified';
  
  // Calculate approximate number of weeks based on timeline
  let weeks = 12; // Default to 3 months
  if (timeline) {
    if (timeline.includes('1 month')) weeks = 4;
    if (timeline.includes('3 months')) weeks = 12;
    if (timeline.includes('6 months')) weeks = 24;
  }
  
  return `Create a HIGHLY DETAILED and PRACTICAL project roadmap for:
Project Title: ${projectTitle}
Description: ${description}
Required Skills: ${skillsList}
Timeline: ${timeline || '3 months'} (approximately ${weeks} weeks)

IMPORTANT REQUIREMENTS:
1. The roadmap must be REALISTIC and ACTIONABLE
2. Tasks must be SPECIFIC and MEASURABLE
3. Include EXACT technologies from the skills list
4. Provide CLEAR milestones with completion criteria
5. Ensure tasks build logically on each other
6. Include testing and quality assurance tasks
7. Account for potential challenges and mitigation strategies

Structure the roadmap with these EXACT phases:
1. Planning & Setup Phase (Week 1-${Math.max(1, Math.floor(weeks * 0.15))})
2. Core Development Phase (Week ${Math.max(2, Math.floor(weeks * 0.15) + 1)}-${Math.max(4, Math.floor(weeks * 0.5))})
3. Feature Implementation Phase (Week ${Math.max(5, Math.floor(weeks * 0.5) + 1)}-${Math.max(8, Math.floor(weeks * 0.8))})
4. Testing & Refinement Phase (Week ${Math.max(9, Math.floor(weeks * 0.8) + 1)}-${weeks})

For EACH phase:
1. Start with a clear MILESTONE that marks completion of the phase
2. List 4-6 specific TASKS with detailed descriptions
3. For each task, include:
   - Estimated duration (in days)
   - Required skills/technologies
   - Completion criteria
   - Dependencies on other tasks (if any)

Additional sections to include:
1. Key challenges and mitigation strategies
2. Learning outcomes and skill development
3. Success metrics and evaluation criteria

Format the response with clear section headers, numbered lists for tasks, and specific timeframes.
IMPORTANT: Make the roadmap HIGHLY SPECIFIC to this exact project - avoid generic tasks that could apply to any project.`;
} 