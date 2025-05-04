import mongoose from 'mongoose';

const ExploreSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  tags: [{ type: String }],
  isStarred: { type: Boolean, default: false },
  stars: { type: Number, default: 0 },
  starredBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  isForked: { type: Boolean, default: false },
  forks: { type: Number, default: 0 },
  forkedFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Explore' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
ExploreSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Explore', ExploreSchema);
