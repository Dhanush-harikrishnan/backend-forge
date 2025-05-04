import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  field: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String },
  current: { type: Boolean, default: false },
  gpa: { type: String }
}, {
  toJSON: {
    transform: function(doc, ret) {
      if (ret.current) {
        ret.endDate = 'Present';
      }
      return ret;
    }
  }
});

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  position: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String },
  current: { type: Boolean, default: false },
  description: { type: String, required: true },
  bullets: [{ type: String }]
}, {
  toJSON: {
    transform: function(doc, ret) {
      if (ret.current) {
        ret.endDate = 'Present';
      }
      return ret;
    }
  }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologies: [{ type: String }],
  url: { type: String },
  github: { type: String }
});

const personalInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  linkedin: { type: String },
  github: { type: String },
  website: { type: String }
});

const ResumeSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  personalInfo: personalInfoSchema,
  education: [educationSchema],
  experience: [experienceSchema],
  skills: [{ type: String }],
  projects: [projectSchema],
  summary: { type: String },
  pdfPath: { type: String },
  pdfUrl: { type: String },
  tedPath: { type: String },
  tedUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
ResumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Resume', ResumeSchema);