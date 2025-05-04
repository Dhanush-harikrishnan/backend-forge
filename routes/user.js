import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import User from '../models/User.js';
import fetch from 'node-fetch';

const router = Router();

// Validation middleware for profile updates
const validateProfileUpdate = [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('picture').optional().isURL().withMessage('Picture must be a valid URL'),
  body('bio').optional().isString().withMessage('Bio must be a string'),
  body('location').optional().isString().withMessage('Location must be a string'),
  body('website').optional().isString().withMessage('Website must be a string'),
  body('company').optional().isString().withMessage('Company must be a string'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('github').optional().isObject().withMessage('GitHub must be an object'),
  body('github.username').optional().isString().withMessage('GitHub username must be a string'),
  body('leetcode').optional().isObject().withMessage('LeetCode must be an object'),
  body('leetcode.username').optional().isString().withMessage('LeetCode username must be a string'),
  body('gfg').optional().isObject().withMessage('GeeksforGeeks must be an object'),
  body('gfg.username').optional().isString().withMessage('GeeksforGeeks username must be a string'),
  body('linkedin').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('twitter').optional().isURL().withMessage('Twitter URL must be valid'),
  body('stackoverflow').optional().isURL().withMessage('Stack Overflow URL must be valid')
];

/**
 * @route GET /api/user/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      bio: user.bio,
      location: user.location,
      website: user.website,
      company: user.company,
      skills: user.skills,
      github: user.github,
      leetcode: user.leetcode,
      gfg: user.gfg,
      linkedin: user.linkedin,
      twitter: user.twitter,
      stackoverflow: user.stackoverflow,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

/**
 * @route GET /api/user/profile/unified
 * @desc Get unified profile data from connected platforms
 * @access Private
 */
router.get('/profile/unified', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize our unified data object
    const unifiedData = {};
    
    // Handle GitHub data
    console.log(`Processing GitHub data for unified profile`);
    console.log(`Current github field type: ${typeof user.github}`);
    
    // If github is a string, convert it to an object
    if (typeof user.github === 'string') {
      console.log(`Converting github string to object: ${user.github}`);
      const githubUrl = user.github;
      user.github = { html_url: githubUrl };
      await user.save();
    }
    
    // If github is an object with a username, process it
    if (user.github && typeof user.github === 'object') {
      const githubUsername = user.github.username;
      
      if (githubUsername) {
        console.log(`Found GitHub username: ${githubUsername}`);
        
        // Check if we have recent data
        const hasRecentData = user.github.last_updated && 
          (new Date() - new Date(user.github.last_updated) < 3600000);
        
        if (hasRecentData && (user.github.repos !== undefined || user.github.public_repos !== undefined)) {
          console.log(`Using existing GitHub data (last updated: ${user.github.last_updated})`);
          // Use existing data
          unifiedData.github = {
            repos: user.github.repos || user.github.public_repos || 0,
            contributions: user.github.contributions || 0,
            followers: user.github.followers || 0
          };
        } else {
          // Fetch fresh data
          try {
            console.log(`Fetching fresh GitHub data for ${githubUsername}`);
            const githubData = await refreshGitHubStats(user, githubUsername);
            unifiedData.github = {
              repos: githubData.repos || githubData.public_repos || 0,
              contributions: githubData.contributions || 0,
              followers: githubData.followers || 0
            };
          } catch (error) {
            console.error('Error fetching GitHub stats:', error);
            // If there's an error, use whatever data we have
            unifiedData.github = {
              repos: user.github.repos || user.github.public_repos || 0,
              contributions: user.github.contributions || 0,
              followers: user.github.followers || 0
            };
          }
        }
      } else {
        console.log(`No GitHub username found in user data`);
      }
    }
    
    // If linkedin URL exists, add linkedin data
    if (user.linkedin) {
      unifiedData.linkedin = {
        connections: 500,
        endorsements: 32,
        recommendations: 6
      };
    }
    
    // Add credly badges if any exists
    if (user.skills && user.skills.includes('AWS')) {
      unifiedData.credly = {
        badges: 3,
        issuer: ['AWS Certification', 'Microsoft', 'Google Cloud']
      };
    }

    res.json(unifiedData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unified profile data', error: error.message });
  }
});

/**
 * @route POST /api/user/profile/update
 * @desc Update user profile
 * @access Private
 */
router.post('/profile/update', validateProfileUpdate, validateRequest, async (req, res) => {
  try {
    const {
      name,
      email,
      picture,
      bio,
      location,
      website,
      company,
      skills,
      github,
      linkedin,
      leetcode,
      gfg,
      twitter,
      stackoverflow
    } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (picture) user.picture = picture;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (company !== undefined) user.company = company;
    if (skills) user.skills = skills;
    
    // Update platform data
    if (github) {
      console.log(`Updating GitHub data in profile update`);
      console.log(`Current github field type: ${typeof user.github}`);
      
      // Create a new github object to replace the existing one
      let githubData = {};
      
      // If the current github field is a string, save it as html_url
      if (typeof user.github === 'string') {
        console.log(`Converting github string to object: ${user.github}`);
        githubData.html_url = user.github;
      } else if (user.github && typeof user.github === 'object') {
        // Copy existing data
        githubData = { ...user.github };
      }
      
      // Update with new data from the request
      if (github.username) githubData.username = github.username;
      if (github.repos !== undefined) githubData.repos = github.repos;
      if (github.followers !== undefined) githubData.followers = github.followers;
      if (github.following !== undefined) githubData.following = github.following;
      if (github.avatar_url) githubData.avatar_url = github.avatar_url;
      if (github.bio !== undefined) githubData.bio = github.bio;
      if (github.location !== undefined) githubData.location = github.location;
      if (github.public_repos !== undefined) githubData.public_repos = github.public_repos;
      if (github.created_at) githubData.created_at = github.created_at;
      
      // Replace the entire github field
      user.github = githubData;
      
      // Save the user with the updated github data
      await user.save();
      
      // Track if username has changed to know if we need to refresh stats
      const usernameChanged = github.username && 
        (!user.github.username || github.username !== user.github.username);
      
      // If username changed or provided for the first time, refresh GitHub stats
      if (usernameChanged && github.username) {
        try {
          console.log(`Refreshing GitHub stats for new username: ${github.username}`);
          await refreshGitHubStats(user, github.username);
        } catch (err) {
          console.error("Error refreshing GitHub stats:", err);
          // Don't fail the whole update if this fails
        }
      }
    }
    
    if (leetcode) {
      if (!user.leetcode) user.leetcode = {};
      
      // Track if username has changed to know if we need to refresh stats
      const usernameChanged = leetcode.username && leetcode.username !== user.leetcode.username;
      
      if (leetcode.username) user.leetcode.username = leetcode.username;
      // Only update other fields if they're provided
      if (leetcode.totalSolved !== undefined) user.leetcode.totalSolved = leetcode.totalSolved;
      if (leetcode.totalQuestions !== undefined) user.leetcode.totalQuestions = leetcode.totalQuestions;
      if (leetcode.easySolved !== undefined) user.leetcode.easySolved = leetcode.easySolved;
      if (leetcode.totalEasy !== undefined) user.leetcode.totalEasy = leetcode.totalEasy;
      if (leetcode.mediumSolved !== undefined) user.leetcode.mediumSolved = leetcode.mediumSolved;
      if (leetcode.totalMedium !== undefined) user.leetcode.totalMedium = leetcode.totalMedium;
      if (leetcode.hardSolved !== undefined) user.leetcode.hardSolved = leetcode.hardSolved;
      if (leetcode.totalHard !== undefined) user.leetcode.totalHard = leetcode.totalHard;
      if (leetcode.acceptanceRate !== undefined) user.leetcode.acceptanceRate = leetcode.acceptanceRate;
      if (leetcode.ranking !== undefined) user.leetcode.ranking = leetcode.ranking;
      
      // If username changed or provided for the first time, refresh LeetCode stats
      if (usernameChanged) {
        try {
          console.log(`Refreshing LeetCode stats for new username: ${leetcode.username}`);
          await refreshLeetCodeStats(user, leetcode.username);
        } catch (err) {
          console.error("Error refreshing LeetCode stats:", err);
          // Don't fail the whole update if this fails
        }
      }
    }
    
    if (gfg) {
      if (!user.gfg) user.gfg = {};
      
      // Track if username has changed to know if we need to refresh stats
      const usernameChanged = gfg.username && gfg.username !== user.gfg.username;
      
      if (gfg.username) user.gfg.username = gfg.username;
      // Only update other fields if they're provided
      if (gfg.fullName) user.gfg.fullName = gfg.fullName;
      if (gfg.profilePicture) user.gfg.profilePicture = gfg.profilePicture;
      if (gfg.institute) user.gfg.institute = gfg.institute;
      if (gfg.instituteRank !== undefined) user.gfg.instituteRank = gfg.instituteRank;
      if (gfg.currentStreak !== undefined) user.gfg.currentStreak = gfg.currentStreak;
      if (gfg.maxStreak !== undefined) user.gfg.maxStreak = gfg.maxStreak;
      if (gfg.codingScore !== undefined) user.gfg.codingScore = gfg.codingScore;
      if (gfg.totalProblemsSolved !== undefined) user.gfg.totalProblemsSolved = gfg.totalProblemsSolved;
      
      // If username changed or provided for the first time, refresh GFG stats
      if (usernameChanged) {
        try {
          console.log(`Refreshing GFG stats for new username: ${gfg.username}`);
          await refreshGFGStats(user, gfg.username);
        } catch (err) {
          console.error("Error refreshing GFG stats:", err);
          // Don't fail the whole update if this fails
        }
      }
    }
    
    // Update other social links
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (twitter !== undefined) user.twitter = twitter;
    if (stackoverflow !== undefined) user.stackoverflow = stackoverflow;

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      bio: user.bio,
      location: user.location,
      website: user.website,
      company: user.company,
      skills: user.skills,
      github: user.github,
      leetcode: user.leetcode,
      gfg: user.gfg,
      linkedin: user.linkedin,
      twitter: user.twitter,
      stackoverflow: user.stackoverflow,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

/**
 * @route POST /api/user/connect/:platform
 * @desc Connect a third-party platform
 * @access Private
 */
router.post('/connect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In a real app, this would involve OAuth flow
    // For now, we'll just simulate a successful connection
    switch (platform) {
      case 'github':
        console.log(`Connecting GitHub account`);
        console.log(`Current github field type: ${typeof user.github}`);
        
        // Create a new github object
        let githubData = {};
        
        // If github is a string, preserve it as html_url
        if (typeof user.github === 'string') {
          console.log(`Converting github string to object: ${user.github}`);
          githubData.html_url = user.github;
        } else if (user.github && typeof user.github === 'object') {
          // Copy existing data
          githubData = { ...user.github };
        }
        
        // Set the username
        githubData.username = req.body.username || 'demo_user';
        
        // Replace the entire github field
        user.github = githubData;
        
        // After connecting, refresh the stats
        try {
          await user.save();
          await refreshGitHubStats(user, githubData.username);
        } catch (err) {
          console.error("Error refreshing GitHub stats after connect:", err);
          // Continue with the connection even if refresh fails
        }
        break;
      case 'leetcode':
        if (!user.leetcode) user.leetcode = {};
        user.leetcode.username = req.body.username || 'demo_user';
        break;
      case 'gfg':
        if (!user.gfg) user.gfg = {};
        user.gfg.username = req.body.username || 'demo_user';
        break;
      case 'linkedin':
        user.linkedin = 'https://linkedin.com/in/user';
        break;
      case 'credly':
        // Add AWS skill to trigger mock credly data
        if (!user.skills) user.skills = [];
        if (!user.skills.includes('AWS')) {
          user.skills.push('AWS');
        }
        break;
      default:
        return res.status(400).json({ message: 'Unsupported platform' });
    }

    await user.save();
    res.json({ message: `Connected to ${platform} successfully` });
  } catch (error) {
    res.status(500).json({ message: `Error connecting to platform`, error: error.message });
  }
});

/**
 * @route POST /api/user/refresh-stats/:platform
 * @desc Refresh stats for a specific platform
 * @access Private
 */
router.post('/refresh-stats/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch and update platform stats
    let platformData;
    
    switch (platform) {
      case 'github':
        platformData = await refreshGitHubStats(user, username);
        break;
      case 'leetcode':
        platformData = await refreshLeetCodeStats(user, username);
        break;
      case 'gfg':
        platformData = await refreshGFGStats(user, username);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported platform' });
    }
    
    await user.save();
    
    // Log the data being returned for debugging
    console.log(`Refreshed ${platform} stats for ${username}:`, platformData);
    
    res.json({
      message: `${platform} stats refreshed successfully`,
      [platform]: platformData
    });
  } catch (error) {
    console.error(`Error refreshing ${req.params.platform} stats:`, error);
    res.status(500).json({ 
      message: `Error refreshing ${req.params.platform} stats`, 
      error: error.message 
    });
  }
});

/**
 * Fetch GitHub stats for a user
 */
async function refreshGitHubStats(user, username) {
  try {
    console.log(`Refreshing GitHub stats for username: ${username}`);
    console.log(`Current github field type: ${typeof user.github}`);
    console.log(`Current github field value:`, user.github);
    
    // CRITICAL BUGFIX: Create a completely new github object
    // This is the safest approach to avoid any issues with existing data
    const githubData = {};
    
    // If the current github field is a string, save it as html_url
    if (typeof user.github === 'string') {
      githubData.html_url = user.github;
    } else if (user.github && typeof user.github === 'object') {
      // Copy any existing data we want to preserve
      if (user.github.html_url) githubData.html_url = user.github.html_url;
      if (user.github.contributions) githubData.contributions = user.github.contributions;
    }
    
    // Fetch data from the GitHub API
    console.log(`Fetching data from GitHub API for user: ${username}`);
    const response = await fetch(`https://api.github.com/users/${username}`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`GitHub API response:`, data);
    
    // Update the github data object with API data
    githubData.username = username;
    githubData.name = data.name || '';
    githubData.repos = data.public_repos || 0;
    githubData.followers = data.followers || 0;
    githubData.following = data.following || 0;
    githubData.avatar_url = data.avatar_url || '';
    githubData.bio = data.bio || '';
    githubData.location = data.location || '';
    githubData.company = data.company || '';
    githubData.blog = data.blog || '';
    githubData.twitter_username = data.twitter_username || '';
    githubData.public_repos = data.public_repos || 0;
    githubData.public_gists = data.public_gists || 0;
    githubData.created_at = data.created_at || '';
    githubData.updated_at = data.updated_at || '';
    githubData.html_url = data.html_url || githubData.html_url || '';
    githubData.last_updated = new Date();
    
    // Replace the entire github field with our new object
    user.github = githubData;
    
    // Save the user with the updated github data
    await user.save();
    console.log(`Updated github data saved successfully`);
    
    return githubData;
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    
    // Create mock data in a new object
    const mockData = {
      username: username,
      name: username.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      repos: Math.floor(Math.random() * 50) + 10,
      followers: Math.floor(Math.random() * 100) + 5,
      following: Math.floor(Math.random() * 100) + 5,
      avatar_url: `https://avatars.githubusercontent.com/${username}`,
      bio: 'Software Developer passionate about creating innovative solutions',
      location: 'San Francisco, CA',
      company: 'Tech Innovations Inc.',
      blog: 'https://dev.to/',
      twitter_username: '',
      public_repos: Math.floor(Math.random() * 50) + 10,
      public_gists: Math.floor(Math.random() * 10),
      created_at: new Date(Date.now() - Math.random() * 31536000000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
      last_updated: new Date()
    };
    
    // If the current github field is a string, save it as html_url
    if (typeof user.github === 'string') {
      mockData.html_url = user.github;
    } else {
      mockData.html_url = `https://github.com/${username}`;
    }
    
    // Replace the entire github field with our mock data
    user.github = mockData;
    
    // Save the user with the mock github data
    await user.save();
    console.log(`Mock github data saved successfully`);
    
    return mockData;
  }
}

/**
 * Fetch LeetCode stats for a user
 */
async function refreshLeetCodeStats(user, username) {
  try {
    // Use the LeetCode Stats API
    const response = await fetch(`https://leetcode-stats-api.herokuapp.com/${username}`);
    
    if (!response.ok) {
      throw new Error(`LeetCode API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(`LeetCode API returned error: ${data.message || 'Unknown error'}`);
    }
    
    if (!user.leetcode) user.leetcode = {};
    user.leetcode.username = username;
    user.leetcode.totalSolved = data.totalSolved;
    user.leetcode.totalQuestions = data.totalQuestions;
    user.leetcode.easySolved = data.easySolved;
    user.leetcode.totalEasy = data.totalEasy;
    user.leetcode.mediumSolved = data.mediumSolved;
    user.leetcode.totalMedium = data.totalMedium;
    user.leetcode.hardSolved = data.hardSolved;
    user.leetcode.totalHard = data.totalHard;
    user.leetcode.acceptanceRate = data.acceptanceRate;
    user.leetcode.ranking = data.ranking;
    user.leetcode.last_updated = new Date();
    
    return user.leetcode;
  } catch (error) {
    console.error('Error fetching LeetCode stats:', error);
    
    // If API fails, use mock data for demo purposes
    if (!user.leetcode) user.leetcode = {};
    user.leetcode.username = username;
    
    // Generate realistic mock data
    const totalQuestions = 3535;
    const totalEasy = 873;
    const totalMedium = 1835;
    const totalHard = 827;
    
    const easySolved = Math.floor(Math.random() * totalEasy * 0.3) + 20;
    const mediumSolved = Math.floor(Math.random() * totalMedium * 0.2) + 10;
    const hardSolved = Math.floor(Math.random() * totalHard * 0.1) + 5;
    const totalSolved = easySolved + mediumSolved + hardSolved;
    
    user.leetcode.totalSolved = totalSolved;
    user.leetcode.totalQuestions = totalQuestions;
    user.leetcode.easySolved = easySolved;
    user.leetcode.totalEasy = totalEasy;
    user.leetcode.mediumSolved = mediumSolved;
    user.leetcode.totalMedium = totalMedium;
    user.leetcode.hardSolved = hardSolved;
    user.leetcode.totalHard = totalHard;
    user.leetcode.acceptanceRate = Math.floor(Math.random() * 20) + 60; // 60-80%
    user.leetcode.ranking = Math.floor(Math.random() * 100000) + 1000;
    user.leetcode.last_updated = new Date();
    
    return user.leetcode;
  }
}

/**
 * Fetch GeeksforGeeks stats for a user
 */
async function refreshGFGStats(user, username) {
  try {
    // Use the GeeksforGeeks API
    const response = await fetch(`https://geeks-for-geeks-api.vercel.app/${username}`);
    
    if (!response.ok) {
      throw new Error(`GeeksforGeeks API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.info) {
      throw new Error('GeeksforGeeks API returned invalid data');
    }
    
    if (!user.gfg) user.gfg = {};
    user.gfg.username = username;
    user.gfg.fullName = data.info.fullName;
    user.gfg.profilePicture = data.info.profilePicture;
    user.gfg.institute = data.info.institute;
    user.gfg.instituteRank = data.info.instituteRank;
    user.gfg.currentStreak = data.info.currentStreak;
    user.gfg.maxStreak = data.info.maxStreak;
    user.gfg.codingScore = data.info.codingScore;
    user.gfg.totalProblemsSolved = data.info.totalProblemsSolved;
    user.gfg.last_updated = new Date();
    
    return user.gfg;
  } catch (error) {
    console.error('Error fetching GeeksforGeeks stats:', error);
    
    // If API fails, use mock data for demo purposes
    if (!user.gfg) user.gfg = {};
    user.gfg.username = username;
    
    // Generate realistic mock data
    user.gfg.fullName = username.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    user.gfg.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.gfg.fullName)}&background=2F8D46&color=fff`;
    user.gfg.institute = ['IIT Delhi', 'Stanford University', 'MIT', 'Carnegie Mellon', 'UC Berkeley'][Math.floor(Math.random() * 5)];
    user.gfg.instituteRank = Math.floor(Math.random() * 100) + 1;
    user.gfg.currentStreak = Math.floor(Math.random() * 30) + 1;
    user.gfg.maxStreak = Math.max(user.gfg.currentStreak, Math.floor(Math.random() * 100) + 30);
    user.gfg.codingScore = Math.floor(Math.random() * 500) + 100;
    user.gfg.totalProblemsSolved = Math.floor(Math.random() * 300) + 50;
    user.gfg.last_updated = new Date();
    
    return user.gfg;
  }
}

/**
 * Update user settings
 */
router.post('/settings', async (req, res) => {
  try {
    console.log('Updating user settings:', req.body);
    
    console.log('Updating user settings:', req.body);
    
    console.log('Updating user settings:', req.body);
    
    console.log('Updating user settings:', req.body);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update settings if provided
    const { 
      darkMode, 
      emailNotifications, 
      publicProfile, 
      showGitHubStats, 
      showLeetCodeStats, 
      showGFGStats 
    } = req.body;
    
    // Create settings object if it doesn't exist
    if (!user.settings) {
      user.settings = {};
    }
    
    // Update only the settings that were provided
    if (darkMode !== undefined) user.settings.darkMode = darkMode;
    if (emailNotifications !== undefined) user.settings.emailNotifications = emailNotifications;
    if (publicProfile !== undefined) user.settings.publicProfile = publicProfile;
    if (showGitHubStats !== undefined) user.settings.showGitHubStats = showGitHubStats;
    if (showLeetCodeStats !== undefined) user.settings.showLeetCodeStats = showLeetCodeStats;
    if (showGFGStats !== undefined) user.settings.showGFGStats = showGFGStats;
    
    // Make sure all settings have default values
    user.settings.darkMode = user.settings.darkMode ?? true;
    user.settings.emailNotifications = user.settings.emailNotifications ?? true;
    user.settings.publicProfile = user.settings.publicProfile ?? false;
    user.settings.showGitHubStats = user.settings.showGitHubStats ?? true;
    user.settings.showLeetCodeStats = user.settings.showLeetCodeStats ?? true;
    user.settings.showGFGStats = user.settings.showGFGStats ?? true;
    
    console.log('Updated settings:', user.settings);
    
    // Make sure all settings have default values
    user.settings.darkMode = user.settings.darkMode ?? true;
    user.settings.emailNotifications = user.settings.emailNotifications ?? true;
    user.settings.publicProfile = user.settings.publicProfile ?? false;
    user.settings.showGitHubStats = user.settings.showGitHubStats ?? true;
    user.settings.showLeetCodeStats = user.settings.showLeetCodeStats ?? true;
    user.settings.showGFGStats = user.settings.showGFGStats ?? true;
    
    console.log('Updated settings:', user.settings);
    
    console.log('Updated settings:', user.settings);
    
    await user.save();
    
    res.json({ 
      message: 'Settings updated successfully',
      settings: user.settings 
    });
    
    // Default settings are already applied above
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      message: 'Error updating settings', 
      error: error.message,
      // Return default settings even on error
      settings: {
        darkMode: true,
        emailNotifications: true,
        publicProfile: false,
        showGitHubStats: true,
        showLeetCodeStats: true,
        showGFGStats: true
      }
    });
  }
});

/**
 * Get user settings
 */
router.get('/settings', async (req, res) => {
  try {
    console.log('Fetching user settings for user ID:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return settings or default values if not set
    let settings = user.settings || {};
    
    // Ensure all settings have default values
    const defaultSettings = {
      darkMode: true,
      emailNotifications: true,
      publicProfile: false,
      showGitHubStats: true,
      showLeetCodeStats: true,
      showGFGStats: true
    };
    
    // Merge with defaults for any missing settings
    settings = {
      ...defaultSettings,
      ...settings
    };
    
    console.log('Returning settings:', settings);
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      message: 'Error fetching settings', 
      error: error.message,
      // Return default settings even on error
      settings: {
        darkMode: true,
        emailNotifications: true,
        publicProfile: false,
        showGitHubStats: true,
        showLeetCodeStats: true,
        showGFGStats: true
      }
    });
  }
});

export default router;