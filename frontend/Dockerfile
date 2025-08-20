# Use Node.js 22.x as specified in package.json
FROM node:22-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set production environment and Docker flag
ENV NODE_ENV=production
ENV CI=true
ENV DOCKER=true

# Run build-time environment validation
RUN npm run validate-env-build

# Build the application for production (matching Vercel build)
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application with runtime environment validation
CMD ["sh", "-c", "npm run validate-env-runtime && npm run start"]
