# Multi-stage build for PompClaude PoC
FROM node:18-alpine AS base

# Install system dependencies for point cloud processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    cmake \
    curl \
    netcat-openbsd

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm install && npm cache clean --force
COPY . .
EXPOSE 3000 8080
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy application files
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pompcloud -u 1001 -G nodejs

# Set up data directory for temporary point cloud storage
RUN mkdir -p /app/data /app/logs && \
    chown -R pompcloud:nodejs /app

# Switch to non-root user
USER pompcloud

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]