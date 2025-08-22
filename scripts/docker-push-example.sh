#!/bin/bash

# Example script showing how to push to Docker Hub like GitHub workflow
# This demonstrates the exact format: docker push mml555/jewgo:"tagname"

echo "🚀 Docker Hub Push Examples for JewGo App"
echo "=========================================="
echo ""

# Show current git status
echo "📋 Current Git Status:"
echo "  Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Latest Tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags found')"
echo ""

# Example 1: Using the workflow script (recommended)
echo "🎯 Example 1: Using the workflow script (recommended)"
echo "Command: ./scripts/docker-hub-workflow.sh build-and-push all --tag commit"
echo "This will:"
echo "  - Build both frontend and backend images"
echo "  - Tag with commit hash: mml555/jewgo-frontend:commit-$(git rev-parse --short HEAD)"
echo "  - Tag with commit hash: mml555/jewgo-backend:commit-$(git rev-parse --short HEAD)"
echo "  - Push both images to Docker Hub"
echo ""

# Example 2: Using custom tag
echo "🎯 Example 2: Using custom tag"
echo "Command: ./scripts/docker-hub-workflow.sh build-and-push all --custom-tag v1.2.3"
echo "This will:"
echo "  - Build both frontend and backend images"
echo "  - Tag with custom tag: mml555/jewgo-frontend:v1.2.3"
echo "  - Tag with custom tag: mml555/jewgo-backend:v1.2.3"
echo "  - Push both images to Docker Hub"
echo ""

# Example 3: Using git tag
echo "🎯 Example 3: Using git tag"
echo "Command: ./scripts/docker-hub-workflow.sh build-and-push all --tag tag"
echo "This will:"
echo "  - Build both frontend and backend images"
echo "  - Tag with git tag: mml555/jewgo-frontend:$(git describe --tags --abbrev=0 2>/dev/null || echo 'v1.0.0')"
echo "  - Tag with git tag: mml555/jewgo-backend:$(git describe --tags --abbrev=0 2>/dev/null || echo 'v1.0.0')"
echo "  - Push both images to Docker Hub"
echo ""

# Example 4: Manual docker commands (not recommended)
echo "🎯 Example 4: Manual docker commands (for reference only)"
echo "Manual commands equivalent to the workflow script:"
echo ""
echo "# Build frontend"
echo "cd frontend"
echo "docker build -t mml555/jewgo-frontend:v1.2.3 ."
echo "docker push mml555/jewgo-frontend:v1.2.3"
echo ""
echo "# Build backend"
echo "cd ../backend"
echo "docker build -t mml555/jewgo-backend:v1.2.3 ."
echo "docker push mml555/jewgo-backend:v1.2.3"
echo ""

# Show npm script shortcuts
echo "🎯 NPM Script Shortcuts:"
echo "  npm run docker:deploy all --tag commit"
echo "  npm run docker:deploy all --custom-tag v1.2.3"
echo "  npm run docker:deploy all --tag tag"
echo ""

# Show current status
echo "📊 Current Status:"
./scripts/docker-hub-workflow.sh status

echo ""
echo "💡 Tip: Use the workflow script for consistent, automated builds!"
echo "   It handles authentication, testing, error handling, and proper tagging."
