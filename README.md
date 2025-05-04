# TrackPro Backend API Documentation

This document provides detailed information about all the API endpoints available in the TrackPro backend server.

## Table of Contents

- [Setup](#setup)
- [Authentication API](#authentication-api)
- [Project API](#project-api)
- [Resume API](#resume-api)
- [Explore API](#explore-api)
- [AI-Powered Features API](#ai-powered-features-api)
- [User API](#user-api)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Gemini API Key (for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Fill in the required environment variables in the `.env` file:
   - `PORT`: Server port (default: 5000)
   - `CLIENT_URL`: Frontend URL (default: http://localhost:3000)
   - `MONGODB_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT token generation
   - `SESSION_SECRET`: Secret key for session management
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: For Google OAuth (if used)
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: For GitHub OAuth (if used)

5. Start the development server:
   ```bash
   npm run dev
   ```

## Authentication API

Base URL: `/api/auth`

### Register a new user

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "profile_picture_url"
  }
}
```

### Login

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "profile_picture_url"
  }
}
```

### Get current user

```
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "profile_picture_url"
  }
}
```

## Project API

Base URL: `/api/projects`

All project endpoints require authentication.

### Generate project recommendations

```
POST /api/projects/generate
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "prompt": "Generate project ideas for a React developer"
}
```

**Response:**
```json
[
  {
    "title": "Project 1",
    "description": "Project description",
    "techStack": ["React", "Node.js"],
    "roadmap": [
      {
        "step": "Step 1: Setup project",
        "difficulty": "Easy"
      },
      {
        "step": "Step 2: Implement features",
        "difficulty": "Medium"
      }
    ]
  }
]
```

### Save a project

```
POST /api/projects/save
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "title": "Project 1",
  "description": "Project description",
  "techStack": ["React", "Node.js"],
  "roadmap": [
    {
      "step": "Step 1: Setup project",
      "difficulty": "Easy"
    },
    {
      "step": "Step 2: Implement features",
      "difficulty": "Medium"
    }
  ]
}
```

**Response:**
```json
{
  "_id": "project_id",
  "title": "Project 1",
  "description": "Project description",
  "techStack": ["React", "Node.js"],
  "roadmap": [
    {
      "step": "Step 1: Setup project",
      "difficulty": "Easy",
      "_id": "step_id_1"
    },
    {
      "step": "Step 2: Implement features",
      "difficulty": "Medium",
      "_id": "step_id_2"
    }
  ],
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Get all saved projects

```
GET /api/projects/saved
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
[
  {
    "_id": "project_id",
    "title": "Project 1",
    "description": "Project description",
    "techStack": ["React", "Node.js"],
    "roadmap": [
      {
        "step": "Step 1: Setup project",
        "difficulty": "Easy",
        "_id": "step_id_1"
      },
      {
        "step": "Step 2: Implement features",
        "difficulty": "Medium",
        "_id": "step_id_2"
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get project roadmaps

```
GET /api/projects/roadmap
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
[
  {
    "_id": "project_id",
    "title": "Project 1",
    "roadmap": [
      {
        "step": "Step 1: Setup project",
        "difficulty": "Easy",
        "_id": "step_id_1"
      },
      {
        "step": "Step 2: Implement features",
        "difficulty": "Medium",
        "_id": "step_id_2"
      }
    ]
  }
]
```

## Resume API

Base URL: `/api/resume`

All resume endpoints require authentication.

### Create a new resume

```
POST /api/resume/create
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "projects": [
    {
      "title": "Project Name",
      "description": "Project description"
    }
  ],
  "experience": "3 years of experience in web development",
  "skills": "JavaScript, React, Node.js, MongoDB",
  "education": "Bachelor of Science in Computer Science"
}
```

**Response:**
```json
{
  "_id": "resume_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "projects": [
    {
      "title": "Project Name",
      "description": "Project description",
      "_id": "project_id"
    }
  ],
  "experience": "3 years of experience in web development",
  "skills": "JavaScript, React, Node.js, MongoDB",
  "education": "Bachelor of Science in Computer Science",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Get all resumes

```
GET /api/resume/all
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
[
  {
    "_id": "resume_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe",
    "projects": [
      {
        "title": "Project Name",
        "description": "Project description",
        "_id": "project_id"
      }
    ],
    "experience": "3 years of experience in web development",
    "skills": "JavaScript, React, Node.js, MongoDB",
    "education": "Bachelor of Science in Computer Science",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get a specific resume

```
GET /api/resume/:id
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "_id": "resume_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "projects": [
    {
      "title": "Project Name",
      "description": "Project description",
      "_id": "project_id"
    }
  ],
  "experience": "3 years of experience in web development",
  "skills": "JavaScript, React, Node.js, MongoDB",
  "education": "Bachelor of Science in Computer Science",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Update a resume

```
PUT /api/resume/:id
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "projects": [
    {
      "title": "Updated Project Name",
      "description": "Updated project description"
    }
  ],
  "experience": "4 years of experience in web development",
  "skills": "JavaScript, React, Node.js, MongoDB, Express",
  "education": "Bachelor of Science in Computer Science"
}
```

**Response:**
```json
{
  "_id": "resume_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "projects": [
    {
      "title": "Updated Project Name",
      "description": "Updated project description",
      "_id": "project_id"
    }
  ],
  "experience": "4 years of experience in web development",
  "skills": "JavaScript, React, Node.js, MongoDB, Express",
  "education": "Bachelor of Science in Computer Science",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Delete a resume

```
DELETE /api/resume/:id
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "message": "Resume deleted successfully"
}
```

## Explore API

Base URL: `/api/explore`

All explore endpoints require authentication.

### Get all explore documents

```
GET /api/explore
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "explores": [
    {
      "_id": "explore_id",
      "title": "Document Title",
      "description": "Document description",
      "author": "Author Name",
      "tags": ["tag1", "tag2"],
      "isStarred": false,
      "stars": 0,
      "isForked": false,
      "forks": 0,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Add a new explore document

```
POST /api/explore
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "title": "Document Title",
  "description": "Document description",
  "author": "Author Name",
  "tags": ["tag1", "tag2"]
}
```

**Response:**
```json
{
  "_id": "explore_id",
  "title": "Document Title",
  "description": "Document description",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "isStarred": false,
  "stars": 0,
  "isForked": false,
  "forks": 0,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Star a document

```
PATCH /api/explore/:id/star
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "_id": "explore_id",
  "title": "Document Title",
  "description": "Document description",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "isStarred": true,
  "stars": 1,
  "isForked": false,
  "forks": 0,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Fork a document

```
PATCH /api/explore/:id/fork
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "_id": "explore_id",
  "title": "Document Title",
  "description": "Document description",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "isStarred": false,
  "stars": 0,
  "isForked": true,
  "forks": 1,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## AI-Powered Features API

Base URL: `/api/ai`

All AI endpoints require authentication.

### Generate project ideas

```
POST /api/ai/project-ideas
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "skills": ["JavaScript", "React", "Node.js"],
  "interests": ["Web Development", "Machine Learning"],
  "experience": "Intermediate"
}
```

**Response:**
```json
{
  "projectIdeas": "1. Project Name: Personal Finance Dashboard\nBrief description: A web application that helps users track expenses, create budgets, and visualize spending patterns.\nKey technologies: React, Node.js, Chart.js, MongoDB\nDifficulty level: Intermediate\nEstimated time to complete: 3-4 weeks\nLearning outcomes: State management, data visualization, CRUD operations, user authentication\n\n2. Project Name: Code Snippet Manager\n..."
}
```

### Analyze resume

```
POST /api/ai/analyze-resume
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "resumeText": "John Doe\njohndoe@example.com\n123-456-7890\n\nEXPERIENCE\nSoftware Developer, ABC Company\nJune 2020 - Present\n- Developed..."
}
```

**Response:**
```json
{
  "analysis": "Strengths:\n1. Clear contact information at the top of the resume\n2. Experience section highlights specific accomplishments\n\nAreas for improvement:\n1. Add a professional summary section\n2. Quantify achievements with metrics\n..."
}
```

### Get career recommendations

```
POST /api/ai/career-recommendations
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "skills": ["JavaScript", "React", "Node.js"],
  "experience": "3 years of frontend development",
  "interests": ["Web Development", "Cloud Computing"],
  "currentRole": "Frontend Developer"
}
```

**Response:**
```json
{
  "recommendations": "Potential career paths:\n1. Full Stack Developer\n   Required skills: Strong JavaScript, React, Node.js, database knowledge\n   Learning resources: MongoDB University, AWS Certified Developer course\n   Timeline for transition: 6-12 months\n   Salary expectations: $90,000 - $120,000\n   Job market outlook: Excellent, with consistent growth\n\n2. DevOps Engineer\n..."
}
```

### Generate project roadmap

```
POST /api/ai/project-roadmap
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "projectTitle": "E-commerce Platform",
  "description": "A full-stack e-commerce platform with product catalog, shopping cart, and payment processing",
  "skills": ["React", "Node.js", "MongoDB", "Stripe API"],
  "timeline": "3 months"
}
```

**Response:**
```json
{
  "roadmap": "Project phases with milestones:\n1. Planning Phase (Week 1-2)\n   - Define requirements and user stories\n   - Create wireframes and design mockups\n   - Set up project repository and infrastructure\n\n2. Backend Development (Week 3-6)\n   Tasks:\n   - Set up Node.js server with Express\n   - Create MongoDB schemas and models\n   - Implement user authentication\n   - Develop API endpoints for products, cart, orders\n   - Integrate payment processing with Stripe\n\n3. Frontend Development (Week 7-10)\n..."
}
```

## User API

Base URL: `/api/user`

All user endpoints require authentication.

### Get user profile

```
GET /api/user/profile
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/avatar.jpg",
  "bio": "Software developer with passion for JavaScript",
  "skills": ["JavaScript", "React", "Node.js"],
  "github": "https://github.com/johndoe",
  "linkedin": "https://linkedin.com/in/johndoe",
  "leetcode": "https://leetcode.com/johndoe",
  "website": "https://johndoe.com",
  "twitter": "https://twitter.com/johndoe",
  "stackoverflow": "https://stackoverflow.com/users/123456/johndoe",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Update user profile

```
PUT /api/user/profile
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "John Doe",
  "picture": "https://example.com/new-avatar.jpg",
  "bio": "Full stack developer with passion for JavaScript and React",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "github": "https://github.com/johndoe",
  "linkedin": "https://linkedin.com/in/johndoe",
  "leetcode": "https://leetcode.com/johndoe",
  "website": "https://johndoe.com",
  "twitter": "https://twitter.com/johndoe",
  "stackoverflow": "https://stackoverflow.com/users/123456/johndoe"
}
```

**Response:**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/new-avatar.jpg",
  "bio": "Full stack developer with passion for JavaScript and React",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "github": "https://github.com/johndoe",
  "linkedin": "https://linkedin.com/in/johndoe",
  "leetcode": "https://leetcode.com/johndoe",
  "website": "https://johndoe.com",
  "twitter": "https://twitter.com/johndoe",
  "stackoverflow": "https://stackoverflow.com/users/123456/johndoe",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```
