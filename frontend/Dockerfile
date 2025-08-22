# Use Node.js 22.x as specified in package.json
FROM node:22-alpine AS builder

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Copy Prisma schema before installing dependencies
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Copy environment file if provided
ARG ENV_FILE
COPY ${ENV_FILE:-.env} .env

# Generate Prisma client
RUN npx prisma generate

# Set production environment and Docker flag
ENV NODE_ENV=production
ENV CI=true
ENV DOCKER=true
# Disable Supabase realtime to prevent RealtimeClient errors
ENV NEXT_PUBLIC_SUPABASE_REALTIME_ENABLED=false

# Run build-time environment validation
RUN npm run validate-env-build

# Build the application for production (matching Vercel build)
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files for production dependencies
COPY package*.json ./
COPY package-lock.json ./

# Copy Prisma schema before installing dependencies
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Generate Prisma client for production
RUN npx prisma generate

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "start"]
