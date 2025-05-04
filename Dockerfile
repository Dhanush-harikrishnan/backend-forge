# Use Node.js latest stable version as base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production && \
    npm cache clean --force

# Runtime image
FROM base AS runner

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    mkdir -p /app/uploads/resumes && \
    chown -R appuser:nodejs /app

# Copy dependencies
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy app source
COPY --chown=appuser:nodejs . .

# Set proper permissions for uploads directory
RUN chmod -R 755 /app/uploads

# Use non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 5000, path: '/api/health', timeout: 2000 }; const req = http.get(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)); req.end();"

# Expose port
EXPOSE 5000

# Start the application with proper Node.js flags for production
CMD ["node", "--max-old-space-size=512", "app.js"]