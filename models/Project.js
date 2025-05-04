import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['Todo', 'In Progress', 'Completed'], 
    default: 'Todo' 
  },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const roadmapItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  dueDate: { 
    type: Date, 
    get: function(date) {
      return date ? date.toISOString() : null;
    },
    set: function(date) {
      return date ? new Date(date) : null;
    }
  },
  completed: { type: Boolean, default: false },
  category: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologies: [{ type: String }],
  status: { 
    type: String, 
    enum: ['Planned', 'In Progress', 'Completed', 'On Hold'], 
    default: 'Planned' 
  },
  isPublic: { type: Boolean, default: false }, // Whether the project is public or private
  stars: { type: Number, default: 0 }, // Number of stars for public projects
  starredBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }], // Users who starred this project
  forks: { type: Number, default: 0 }, // Number of forks for public projects
  forkedFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  }, // Original project if this is a fork
  tasks: [taskSchema],
  roadmap: { type: String }, // Keeping for backward compatibility
  roadmapItems: [roadmapItemSchema], // Structured roadmap for tracking
  roadmapOverview: { type: String }, // General overview/description of the roadmap
  githubUrl: { type: String },
  demoUrl: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Project', ProjectSchema);