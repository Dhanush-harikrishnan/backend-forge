import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

/**
 * Get user settings
 */
router.get('/', async (req, res) => {
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

/**
 * Update user settings
 */
router.post('/', async (req, res) => {
  try {
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
    
    await user.save();
    
    res.json({ 
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

export default router;