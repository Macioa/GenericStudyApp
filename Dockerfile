# Multi-stage build
# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 4173
EXPOSE 4173

# Start the application
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]