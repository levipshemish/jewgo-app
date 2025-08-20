# Docker Frontend Testing Setup

## 🚀 Quick Setup

### 1. Start Docker
Make sure Docker Desktop is running on your Mac:
```bash
# Check if Docker is running
docker --version
docker info
```

If Docker isn't running, start Docker Desktop from Applications.

### 2. Start Your Real Backend
```bash
# Terminal 1: Start backend
source .venv/bin/activate
cd backend
python -m flask run
```

### 3. Build and Start Frontend Container
```bash
# Terminal 2: Build and start frontend
./scripts/docker-frontend.sh build
./scripts/docker-frontend.sh start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000 (Docker container)
- **Backend**: http://localhost:5000 (your real backend)

## 📋 Available Commands

```bash
./scripts/docker-frontend.sh build     # Build container
./scripts/docker-frontend.sh start     # Start container
./scripts/docker-frontend.sh stop      # Stop container
./scripts/docker-frontend.sh logs      # View logs
./scripts/docker-frontend.sh status    # Check status
./scripts/docker-frontend.sh shell     # Access container shell
./scripts/docker-frontend.sh cleanup   # Clean up resources
./scripts/docker-frontend.sh help      # Show help
```

## 🔧 How It Works

- **Frontend**: Runs in Docker container on port 3000
- **Backend**: Uses your real backend on port 5000
- **Connection**: Container connects to backend via `host.docker.internal:5000`
- **Hot Reloading**: Source code is mounted for live development
- **Environment**: Uses development mode with hot reloading

## 🛠️ Development Workflow

1. **Start backend locally** (Terminal 1)
2. **Start frontend in Docker** (Terminal 2)
3. **Make changes** to frontend code
4. **See changes immediately** (hot reloading)
5. **Test with real backend data**

## 🔍 Troubleshooting

### Docker Not Running
```bash
# Start Docker Desktop from Applications
# Or check status
docker info
```

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000
# Kill if needed
lsof -ti:3000 | xargs kill -9
```

### Backend Connection Issues
```bash
# Check if backend is running
curl http://localhost:5000/health
```

### Container Issues
```bash
# Clean up and restart
./scripts/docker-frontend.sh cleanup
./scripts/docker-frontend.sh build
./scripts/docker-frontend.sh start
```

## 📚 Benefits

- ✅ **Isolated testing** - Frontend changes don't affect local environment
- ✅ **Real backend data** - Connects to your actual backend
- ✅ **Hot reloading** - See changes immediately
- ✅ **Consistent environment** - Same setup across team members
- ✅ **Easy cleanup** - Remove container when done

## 🎯 Perfect For

- Testing frontend changes with real backend
- Debugging frontend-specific issues
- Team development consistency
- CI/CD pipeline testing
- Production-like environment testing
