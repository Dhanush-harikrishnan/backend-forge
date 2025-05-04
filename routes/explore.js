import express from 'express';
const router = express.Router();
import Explore from '../models/Explore.js';
import { logger } from '../utils/logger.js';

// Get all explore documents
router.get("/", async (req, res) => {
  try {
    const explores = await Explore.find().sort({ createdAt: -1 });
    res.json(explores);
  } catch (error) {
    logger.error('Error fetching explore documents:', error);
    res.status(500).json({ message: "Error fetching explore documents", error: error.message });
  }
});

// Add a new explore document
router.post("/", async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const newExplore = new Explore({
      title,
      description,
      author: req.user._id,
      tags: tags || [],
      user: req.user._id
    });

    await newExplore.save();
    res.status(201).json(newExplore);
  } catch (error) {
    logger.error('Error creating explore document:', error);
    res.status(500).json({ message: "Error creating explore document", error: error.message });
  }
});

// Star a document
router.patch("/:id/star", async (req, res) => {
  try {
    const explore = await Explore.findById(req.params.id);
    if (!explore) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if user has already starred
    const hasStarred = explore.starredBy?.includes(req.user._id);
    
    if (hasStarred) {
      explore.starredBy = explore.starredBy.filter(id => id.toString() !== req.user._id.toString());
      explore.stars = Math.max(0, explore.stars - 1);
    } else {
      if (!explore.starredBy) explore.starredBy = [];
      explore.starredBy.push(req.user._id);
      explore.stars = (explore.stars || 0) + 1;
    }

    await explore.save();
    res.json(explore);
  } catch (error) {
    logger.error('Error updating stars:', error);
    res.status(500).json({ message: "Error updating stars", error: error.message });
  }
});

// Fork a document
router.patch("/:id/fork", async (req, res) => {
  try {
    const explore = await Explore.findById(req.params.id);
    if (!explore) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Create a new explore document based on the original
    const forkedExplore = new Explore({
      title: `${explore.title} (Fork)`,
      description: explore.description,
      author: req.user._id,
      tags: explore.tags,
      user: req.user._id,
      forkedFrom: explore._id
    });

    await forkedExplore.save();

    // Update original document's fork count
    explore.forks = (explore.forks || 0) + 1;
    await explore.save();

    res.json(forkedExplore);
  } catch (error) {
    logger.error('Error forking document:', error);
    res.status(500).json({ message: "Error forking document", error: error.message });
  }
});

export default router;
