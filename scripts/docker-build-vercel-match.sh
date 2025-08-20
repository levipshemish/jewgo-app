#!/bin/bash
set -e

echo "=== Starting Docker Build (Vercel-Matched) ==="
echo "Current directory: $(pwd)"

# Set production environment variables (matching Vercel)
export NODE_ENV=production
export CI=true
export VERCEL=1

# Change to frontend directory (matching vercel.json buildCommand)
echo "=== Changing to frontend directory ==="
cd frontend
echo "Current directory: $(pwd)"

# Install dependencies (matching vercel.json installCommand)
echo "=== Installing dependencies ==="
npm install

# Validate environment variables (matching vercel.json buildCommand)
echo "=== Validating environment variables ==="
npm run validate-env

# Build the application (matching vercel.json buildCommand)
echo "=== Building the application ==="
npm run build

echo "=== Build completed successfully! ==="
echo "Build output directory: $(pwd)/.next"
ls -la .next/ 2>/dev/null || echo "No .next directory found"

echo "=== Vercel-matched build process completed ==="
