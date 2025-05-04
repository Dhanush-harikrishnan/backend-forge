import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { connectDB } from './config/database.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
config();

// Initialize express app
const app = express();

// Ensure logs directory exists
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Disable CSP for development/testing
}));

// Configure CORS with more permissive settings
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://track-pro.vercel.app', 
    'https://frontend-forge.vercel.app',
    'https://frontend-forge-git-main-dhanush-hs-projects.vercel.app',
    'https://frontend-forge-lali5ugto-dhanush-hs-projects.vercel.app',
    'https://frontend-forge-dhanush-hs-projects.vercel.app',
    process.env.CLIENT_URL,
    // Add your new Vercel deployment URL
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // If you know your exact Vercel URL, add it here explicitly
    'https://protrack.vercel.app'
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: false, // Set to false since we're using 'omit' on the frontend
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Add static file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint - specifically for frontend connection checks
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
