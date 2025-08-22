# 🚀 JewGo Quick Start Guide

## 🎯 Get Started in 3 Steps

### 1. Prerequisites
- Docker and Docker Compose installed
- Git (to clone the repository)

### 2. Start the Application (Docker recommended)
```bash
# Run the automated setup script (build + start + health checks)
./scripts/setup-docker.sh
```

### 3. Access the Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## 🛠️ Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Start all services
docker-compose -f docker-compose.optimized.yml up -d

# Check status
docker-compose -f docker-compose.optimized.yml ps

# View logs
docker-compose -f docker-compose.optimized.yml logs -f
```

## 📊 Service Status

### Docker Setup Script Commands
```bash
./scripts/setup-docker.sh          # Start all services
./scripts/setup-docker.sh stop     # Stop services
./scripts/setup-docker.sh restart  # Restart services
./scripts/setup-docker.sh logs     # View logs
./scripts/setup-docker.sh status   # Show status
./scripts/setup-docker.sh clean    # Clean up Docker resources
./scripts/setup-docker.sh help     # Show help
```

### Manual Docker Commands
```bash
# Start services
docker-compose -f docker-compose.optimized.yml up -d

# Stop services
docker-compose -f docker-compose.optimized.yml down

# Rebuild services
docker-compose -f docker-compose.optimized.yml up -d --build

# View logs
docker-compose -f docker-compose.optimized.yml logs -f [service-name]
```

## 🔧 Configuration

### Environment Files
- Root `.env` is the master source of truth used for local dev and validation.
- Example files (e.g., `env.template`, `frontend/env.example`) are references only and must not contain real secrets. Use placeholders like `CHANGEME` or `<VALUE>`.
- Validate consistency anytime:
  ```bash
  npm run env:check        # basic check
  npm run env:check:strict # also flags extra keys
  ```

### Ports
- **Frontend**: 3001
- **Backend**: 5001
- **Database**: 5433
- **Redis**: 6380

## 🧪 Testing

### Quick Health Check
```bash
# Test backend
curl http://localhost:5001/health

# Test frontend
curl http://localhost:3001
```

### Run Tests
```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## 🐛 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker is running
docker info

# Clean up and restart
./scripts/setup-docker.sh clean
./scripts/setup-docker.sh
```

**Port conflicts:**
```bash
# Check what's using the ports
lsof -i :3001
lsof -i :5001
lsof -i :5433
lsof -i :6380
```

**Database connection issues:**
```bash
# Check database logs
docker-compose -f docker-compose.optimized.yml logs postgres

# Restart database
docker-compose -f docker-compose.optimized.yml restart postgres
```

### Logs and Debugging
```bash
# View all logs
docker-compose -f docker-compose.optimized.yml logs -f

# View specific service logs
docker-compose -f docker-compose.optimized.yml logs -f backend
docker-compose -f docker-compose.optimized.yml logs -f frontend
docker-compose -f docker-compose.optimized.yml logs -f postgres
docker-compose -f docker-compose.optimized.yml logs -f redis
```

## 📱 Development Workflow

### Local Development (non-Docker)
```bash
# Backend development (Flask)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py   # serves on http://localhost:8082 (health: /health)

# Frontend development
cd frontend
npm install
npm run dev
```

### Production Deployment
- Use the build/deploy wrapper scripts:
  ```bash
  # Full update: build, push, deploy
  npm run update all --env prod

  # Status and logs
  npm run status
  npm run logs all
  ```

## 🔒 Security Notes

- Docker setup uses placeholder values for development
- Production environment requires real API keys and credentials
- Environment variables are properly configured for security
- CORS is configured for local development

## 📞 Support

### Documentation
- Build/Deploy quick ref: `BUILD_AND_DEPLOY_QUICK_REFERENCE.md`
- Docker setup: `DOCKER_SETUP.md`
- Supabase setup: `SUPABASE_SETUP.md`

### Getting Help
1. Check the troubleshooting section above
2. Review the logs using `./scripts/setup-docker.sh logs`
3. Check the project status report
4. Verify Docker and Docker Compose are properly installed

---

**Next Steps**: After successful setup, explore the application at http://localhost:3001

Last Updated: 2025-08-22
