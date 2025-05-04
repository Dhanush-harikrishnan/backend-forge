import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String, default: 'https://www.gravatar.com/avatar/?d=mp' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  company: { type: String, default: '' },
  skills: [{ type: String }],
  
  // User settings
  settings: {
    darkMode: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: false },
    showGitHubStats: { type: Boolean, default: true },
    showLeetCodeStats: { type: Boolean, default: true },
    showGFGStats: { type: Boolean, default: true },
  },
  
  // Structured data for GitHub
  // Allow github to be either a string or an object
  github: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Structured data for LeetCode
  leetcode: {
    username: { type: String, default: '' },
    totalSolved: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    totalEasy: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    totalMedium: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalHard: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    ranking: { type: Number, default: 0 },
    last_updated: { type: Date }
  },
  
  // Structured data for GeeksforGeeks
  gfg: {
    username: { type: String, default: '' },
    fullName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    institute: { type: String, default: '' },
    instituteRank: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    totalProblemsSolved: { type: Number, default: 0 },
    last_updated: { type: Date }
  },
  
  // Keep other social links
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  stackoverflow: { type: String, default: '' },
  
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  explores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Explore' }],
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // CRITICAL BUGFIX: Ensure github is always an object
  if (typeof this.github === 'string') {
    console.log(`Pre-save hook: Converting github field from string to object: ${this.github}`);
    const githubUrl = this.github;
    this.github = {
      html_url: githubUrl
    };
  } else if (!this.github) {
    this.github = {};
  }
  
  next();
});

export default mongoose.model("User", UserSchema);