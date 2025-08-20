# Docker Frontend Testing Setup

This setup allows you to run the frontend in a Docker container while connecting to your real backend running locally.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Real backend running on `http://localhost:5000`
- Node.js 22.x (for local development if needed)

### 1. Start Your Real Backend
First, make sure your backend is running locally:
```bash
# In your project root
source .venv/bin/activate
cd backend
python -m flask run
# or
python app.py
```

### 2. Build and Start Frontend Container
```bash
# Build the frontend container
./scripts/docker-frontend.sh build

# Start the frontend container
./scripts/docker-frontend.sh start
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000 (your real backend)

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `./scripts/docker-frontend.sh build` | Build the frontend Docker container |
| `./scripts/docker-frontend.sh start` | Start the frontend container |
| `./scripts/docker-frontend.sh stop` | Stop the frontend container |
| `./scripts/docker-frontend.sh restart` | Restart the frontend container |
| `./scripts/docker-frontend.sh logs` | Show container logs |
| `./scripts/docker-frontend.sh status` | Show container status |
| `./scripts/docker-frontend.sh shell` | Open shell in container |
| `./scripts/docker-frontend.sh cleanup` | Clean up Docker resources |
| `./scripts/docker-frontend.sh help` | Show help message |

## 🔧 Configuration

### Environment Variables
The container is configured with these environment variables:
- `NODE_ENV=development`
- `NEXT_PUBLIC_API_URL=http://host.docker.internal:5000`
- `NEXT_PUBLIC_BACKEND_URL=http://host.docker.internal:5000`

### Volume Mounting
- Source code is mounted for hot reloading
- Environment files are mounted from `config/environment/`
- Node modules and build cache are preserved

### Network Configuration
- Container uses `host.docker.internal` to access host services
- Frontend runs on port 3000
- Connects to backend on port 5000

## 🛠️ Development Workflow

### 1. Start Backend Locally
```bash
# Terminal 1: Start backend
source .venv/bin/activate
cd backend
python -m flask run
```

### 2. Start Frontend in Docker
```bash
# Terminal 2: Start frontend container
./scripts/docker-frontend.sh start
```

### 3. Development
- Make changes to frontend code
- Changes are automatically reflected (hot reloading)
- Backend changes require restarting the backend service

### 4. Testing
```bash
# View logs
./scripts/docker-frontend.sh logs

# Check status
./scripts/docker-frontend.sh status

# Access container shell
./scripts/docker-frontend.sh shell
```

## 🔍 Troubleshooting

### Backend Connection Issues
If the frontend can't connect to the backend:
1. Ensure backend is running on `http://localhost:5000`
2. Check backend health endpoint: `curl http://localhost:5000/health`
3. Verify firewall settings allow Docker to access host

### Port Conflicts
If port 3000 is already in use:
```bash
# Stop any existing services
lsof -ti:3000 | xargs kill -9

# Or modify the port in docker-compose.frontend.dev.yml
```

### Container Issues
```bash
# Clean up and restart
./scripts/docker-frontend.sh cleanup
./scripts/docker-frontend.sh build
./scripts/docker-frontend.sh start
```

### Permission Issues
```bash
# Make script executable
chmod +x scripts/docker-frontend.sh
```

## 🎯 Use Cases

### 1. **Isolated Frontend Testing**
- Test frontend changes without affecting local environment
- Ensure frontend works with real backend data
- Debug frontend-specific issues

### 2. **Team Development**
- Consistent frontend environment across team members
- Easy onboarding for frontend developers
- No "works on my machine" issues

### 3. **CI/CD Preparation**
- Test frontend in containerized environment
- Verify Docker build process
- Debug deployment issues

### 4. **Production-like Testing**
- Test frontend with production-like environment
- Verify environment variable handling
- Test container networking

## 🔄 Alternative Approaches

### Production Build
For production testing, use the production Dockerfile:
```bash
docker-compose -f docker-compose.frontend.yml up -d
```

### Local Development
For local development without Docker:
```bash
cd frontend
npm install
npm run dev
```

## 📚 Next Steps

1. **Test the setup** with a simple frontend change
2. **Configure environment variables** as needed
3. **Set up CI/CD pipeline** using the Docker setup
4. **Share with team members** for consistent development

This Docker setup provides a clean, isolated environment for frontend testing while maintaining connection to your real backend!
