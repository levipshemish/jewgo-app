# Docker Hub Quick Reference

## 🚀 Quick Commands

### Build and Push (Most Common)
```bash
# Build and push all images with latest tag
npm run docker:deploy

# Build and push with commit hash
npm run docker:deploy all --tag commit

# Build and push with custom tag
npm run docker:deploy all --custom-tag v1.2.3
```

### Direct Script Usage
```bash
# Build and push all images
./scripts/docker-hub-workflow.sh build-and-push all

# Build and push frontend only
./scripts/docker-hub-workflow.sh build-and-push frontend --tag commit

# Build and push backend only
./scripts/docker-hub-workflow.sh build-and-push backend --custom-tag v1.0.0
```

## 🏷️ Tagging Examples

| Command | Result |
|---------|--------|
| `--tag latest` | `mml555/jewgo-frontend:latest` |
| `--tag commit` | `mml555/jewgo-frontend:commit-88e05b4` |
| `--tag tag` | `mml555/jewgo-frontend:v1.2.3` |
| `--tag branch` | `mml555/jewgo-frontend:main` |
| `--tag timestamp` | `mml555/jewgo-frontend:build-20241201-143022` |
| `--custom-tag v1.2.3` | `mml555/jewgo-frontend:v1.2.3` |

## 📦 Management Commands

```bash
# List local images
npm run docker:list

# Clean up local images
npm run docker:clean

# Show build status
npm run docker:hub-status
```

## 🔧 Advanced Options

```bash
# Skip tests
./scripts/docker-hub-workflow.sh build-and-push all --skip-tests

# Use different Dockerfile
./scripts/docker-hub-workflow.sh build frontend --dockerfile Dockerfile.optimized

# Build specific service
./scripts/docker-hub-workflow.sh build-and-push frontend --tag commit
```

## 🐳 Manual Commands (Reference)

```bash
# Manual build and push (not recommended)
cd frontend
docker build -t mml555/jewgo-frontend:v1.2.3 .
docker push mml555/jewgo-frontend:v1.2.3

cd ../backend
docker build -t mml555/jewgo-backend:v1.2.3 .
docker push mml555/jewgo-backend:v1.2.3
```

## 📋 Prerequisites

1. **Docker Desktop** running
2. **Docker Hub login**: `docker login`
3. **Git repository** with proper versioning

## 🚨 Troubleshooting

```bash
# Check Docker status
./scripts/docker-hub-workflow.sh status

# Check Docker Hub auth
docker info | grep Username

# Re-authenticate if needed
docker logout && docker login
```

---

**💡 Tip**: Use `npm run docker:deploy` for the easiest workflow!
