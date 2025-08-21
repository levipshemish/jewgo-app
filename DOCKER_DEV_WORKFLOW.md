# Docker Development Workflow Guide

## 🚀 Quick Start

This guide shows you how to automatically rebuild Docker containers when you make design and function changes, eliminating the need for manual terminal builds.

## 📋 Prerequisites

- Docker Desktop installed and running
- Node.js 22+ (for local development)
- Git

## 🎯 Workflow Options

### Option 1: Auto-Rebuild with File Watching (Recommended)

This automatically rebuilds containers when you save files:

```bash
# Start development environment with auto-rebuild
npm run docker:watch

# Or use the script directly
./scripts/auto-docker-dev.sh watch
```

**What this does:**
- Starts Docker containers in development mode
- Watches for file changes in the `frontend/` directory
- Automatically rebuilds and restarts containers when files change
- Provides real-time feedback in the terminal

### Option 2: Manual Rebuild

For when you want control over when rebuilds happen:

```bash
# Start development environment
npm run docker:dev

# Manually rebuild when needed
npm run docker:rebuild
```

### Option 3: Production-like Testing

For testing production builds:

```bash
# Build and run production-like environment
docker-compose -f docker-compose.production.yml up --build
```

## 🛠️ Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `docker:dev` | Start development environment | `npm run docker:dev` |
| `docker:watch` | Start with auto-rebuild | `npm run docker:watch` |
| `docker:rebuild` | Manually rebuild frontend | `npm run docker:rebuild` |
| `docker:logs` | Show container logs | `npm run docker:logs` |
| `docker:status` | Show container status | `npm run docker:status` |
| `docker:stop` | Stop all containers | `npm run docker:stop` |
| `docker:cleanup` | Stop and clean up | `npm run docker:cleanup` |

## 🔧 How It Works

### File Watching
The system uses file watchers to detect changes:
- **fswatch** (macOS/Linux) - Primary file watcher
- **inotifywait** (Linux) - Fallback file watcher
- **Manual rebuild** - When no file watcher is available

### Hot Reloading
- Source code is mounted as volumes for instant updates
- Next.js development server runs with enhanced file watching
- Environment variables are configured for development
- Health checks ensure containers are running properly

### Auto-Rebuild Process
1. File change detected in `frontend/` directory
2. Container rebuilds with new code
3. Service restarts automatically
4. Changes are immediately available at `http://localhost:3000`

## 📁 File Structure

```
jewgo app/
├── docker-compose.dev.yml          # Development Docker Compose
├── docker-compose.production.yml   # Production Docker Compose
├── frontend/
│   ├── Dockerfile.dev              # Development Dockerfile
│   └── Dockerfile.optimized        # Production Dockerfile
├── scripts/
│   └── auto-docker-dev.sh          # Auto-rebuild script
└── package.json                    # NPM scripts for easy access
```

## 🎨 Development Workflow

### 1. Start Development
```bash
# Start with auto-rebuild (recommended)
npm run docker:watch

# Or start without auto-rebuild
npm run docker:dev
```

### 2. Make Changes
- Edit files in `frontend/` directory
- Save your changes
- Containers automatically rebuild (if using watch mode)
- View changes at `http://localhost:3000`

### 3. Monitor Status
```bash
# Check container status
npm run docker:status

# View logs
npm run docker:logs
```

### 4. Manual Rebuild (if needed)
```bash
# Rebuild frontend service
npm run docker:rebuild
```

## 🔍 Troubleshooting

### Container Not Starting
```bash
# Check Docker status
docker info

# Check container logs
npm run docker:logs

# Restart containers
npm run docker:stop
npm run docker:dev
```

### File Changes Not Detected
```bash
# Install file watcher (macOS)
brew install fswatch

# Install file watcher (Ubuntu/Debian)
sudo apt-get install inotify-tools

# Or use manual rebuild
npm run docker:rebuild
```

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Stop conflicting services
npm run docker:stop
```

### Clean Slate
```bash
# Complete cleanup
npm run docker:cleanup

# Start fresh
npm run docker:dev
```

## 🚀 Production Deployment

When ready to deploy:

```bash
# Build production image
docker-compose -f docker-compose.production.yml build

# Test production build locally
docker-compose -f docker-compose.production.yml up

# Push to production
git push origin main
```

## 📊 Performance Tips

### Faster Builds
- Use BuildKit: `export DOCKER_BUILDKIT=1`
- Leverage Docker layer caching
- Exclude unnecessary files in `.dockerignore`

### Resource Optimization
- Monitor container resource usage: `docker stats`
- Clean up unused images: `docker system prune`
- Use multi-stage builds for smaller images

## 🔒 Security Notes

- Development containers run with development environment variables
- Production containers use optimized, secure configurations
- Never commit sensitive environment variables
- Use `.env` files for local development

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review container logs: `npm run docker:logs`
3. Check Docker status: `docker info`
4. Restart Docker Desktop if needed
5. Run cleanup: `npm run docker:cleanup`

## 🎉 Benefits

✅ **No Manual Builds** - Changes automatically rebuild containers
✅ **Fast Development** - Hot reloading for instant feedback  
✅ **Consistent Environment** - Same setup across all developers
✅ **Easy Commands** - Simple npm scripts for common tasks
✅ **Production Parity** - Test production builds locally
✅ **Resource Efficient** - Optimized Docker configurations

---

**Happy coding! 🚀**
