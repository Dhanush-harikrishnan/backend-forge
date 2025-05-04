import { validationResult, body } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateAIRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateProjectIdeas = [
  body('skills').isArray().withMessage('Skills must be an array'),
  body('interests').isArray().withMessage('Interests must be an array'),
  body('experience').isString().withMessage('Experience must be a string')
];

export const validateResumeAnalysis = [
  body('resumeText').isString().withMessage('Resume text must be a string')
];

export const validateCareerRecommendations = [
  body('skills').isArray().withMessage('Skills must be an array'),
  body('experience').isString().withMessage('Experience must be a string'),
  body('interests').isArray().withMessage('Interests must be an array'),
  body('currentRole').isString().withMessage('Current role must be a string')
];

export const validateProjectRoadmap = [
  body('projectTitle').isString().withMessage('Project title must be a string'),
  body('description').isString().withMessage('Description must be a string'),
  body('skills').isArray().withMessage('Skills must be an array'),
  body('timeline').isString().withMessage('Timeline must be a string')
];