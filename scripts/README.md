# JewGo Ngrok Deployment Scripts

This directory contains scripts for creating one-time production deployments of the JewGo system using ngrok for external access.

## Quick Start

### 1. Deploy the System
```bash
./scripts/quick-ngrok-deploy.sh
```

### 2. Test the Deployment
```bash
./scripts/test-ngrok-deployment.sh
```

### 3. Stop the Deployment
```bash
./scripts/stop-ngrok-deploy.sh
```

## Scripts Overview

### `quick-ngrok-deploy.sh`
**Purpose**: Quick deployment of the entire JewGo system with ngrok tunnels

**Features**:
- Checks prerequisites (Docker, ngrok, etc.)
- Sets up production environment files
- Builds and starts all services
- Creates ngrok tunnels for external access
- Provides URLs for access

**Usage**:
```bash
./scripts/quick-ngrok-deploy.sh
```

### `production-ngrok-deploy.sh`
**Purpose**: Comprehensive deployment with advanced features

**Features**:
- All features from quick deploy
- Detailed health checks
- Better error handling
- Comprehensive logging
- Automatic cleanup on exit

**Usage**:
```bash
./scripts/production-ngrok-deploy.sh
```

### `test-ngrok-deployment.sh`
**Purpose**: Test and verify the deployment is working correctly

**Features**:
- Container status checks
- Health endpoint verification
- Network connectivity tests
- Ngrok tunnel validation
- Application functionality tests

**Usage**:
```bash
./scripts/test-ngrok-deployment.sh
```

### `stop-ngrok-deploy.sh`
**Purpose**: Stop the deployment and clean up resources

**Features**:
- Stops all services
- Removes containers and volumes
- Cleans up environment files
- Option to remove unused Docker images

**Usage**:
```bash
./scripts/stop-ngrok-deploy.sh
```

## Prerequisites

### Required Software
- **Docker**: Container platform
- **Docker Compose**: Multi-container orchestration
- **ngrok**: Tunnel service for external access
- **curl**: HTTP client for health checks
- **jq**: JSON processor for parsing ngrok responses

### ngrok Setup
1. Sign up at https://ngrok.com
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Install ngrok:
   ```bash
   # macOS
   brew install ngrok/ngrok/ngrok
   
   # Linux
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```
4. Authenticate:
   ```bash
   ngrok authtoken YOUR_TOKEN_HERE
   ```

## Deployment Architecture

The deployment creates a complete production environment with:

- **Frontend**: Next.js application (Port 3000)
- **Backend**: Flask API with Gunicorn (Port 8081)
- **Database**: PostgreSQL (Port 5432)
- **Cache**: Redis (Port 6379)
- **Ngrok Tunnels**: External access (Ports 4040, 4041)

## Environment Variables

The scripts automatically generate production environment files:

### Backend Environment
- Production Flask configuration
- Auto-generated secrets
- Database and Redis connections
- CORS settings for ngrok domains

### Frontend Environment
- Production Next.js configuration
- API endpoint configuration
- NextAuth settings
- Database connection

## Monitoring

### View Logs
```bash
# All services
docker-compose -f docker-compose.ngrok.yml logs -f

# Specific service
docker-compose -f docker-compose.ngrok.yml logs -f backend
docker-compose -f docker-compose.ngrok.yml logs -f frontend
```

### Health Checks
```bash
# Backend health
curl http://localhost:8081/health

# Frontend health
curl http://localhost:3000

# Database health
docker-compose -f docker-compose.ngrok.yml exec postgres pg_isready -U jewgo_user -d jewgo

# Redis health
docker-compose -f docker-compose.ngrok.yml exec redis redis-cli ping
```

### Ngrok Monitoring
- **Frontend Tunnel**: http://localhost:4040
- **Backend Tunnel**: http://localhost:4041

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8081
lsof -i :5432
lsof -i :6379
```

#### ngrok Authentication
```bash
# Check ngrok config
ngrok config check

# Re-authenticate
ngrok authtoken YOUR_TOKEN
```

#### Service Issues
```bash
# Check service logs
docker-compose -f docker-compose.ngrok.yml logs backend
docker-compose -f docker-compose.ngrok.yml logs frontend

# Restart services
docker-compose -f docker-compose.ngrok.yml restart backend
```

### Debug Mode
For debugging, use the development configuration:
```bash
docker-compose -f docker-compose.full.yml up -d
docker-compose -f docker-compose.full.yml logs -f
```

## Security Notes

⚠️ **Important Security Considerations**:

- This is a **production deployment** with real data
- ngrok tunnels are **publicly accessible**
- Keep ngrok URLs secure and don't share publicly
- Monitor logs for security issues
- Use strong passwords in real production

## Cleanup

The deployment creates temporary files that are automatically cleaned up when stopped:

- `docker-compose.ngrok.yml` - Docker Compose configuration
- `config/environment/backend.production.env` - Backend environment
- `config/environment/frontend.production.env` - Frontend environment

These files are removed when you run the stop script.

## Support

For issues:
1. Check the troubleshooting section
2. Review service logs
3. Verify prerequisites are met
4. Ensure ngrok is properly configured
5. Check the main documentation at `docs/deployment/NGROK_PRODUCTION_DEPLOYMENT.md`
