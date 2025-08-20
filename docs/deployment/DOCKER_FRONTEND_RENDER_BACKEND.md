# Docker Frontend with Render Backend Setup

## Overview

This setup allows you to run the JewGo frontend in Docker while connecting to your existing Render backend. This is perfect for:
- Local development and testing
- Consistent environment across team members
- Testing frontend changes without affecting production
- Debugging frontend issues in isolation

## Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
# Start frontend-only setup (connects to Render backend)
./scripts/docker-setup.sh frontend-only
```

### Option 2: Manual Setup

```bash
# Build and start the frontend
docker-compose -f docker-compose.frontend-only.yml build
docker-compose -f docker-compose.frontend-only.yml up -d

# Check status
docker-compose -f docker-compose.frontend-only.yml ps

# View logs
docker-compose -f docker-compose.frontend-only.yml logs -f
```

## Configuration

### Environment Variables

The frontend is configured to connect to your Render backend:

```yaml
# docker-compose.frontend-only.yml
environment:
  - NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com
```

### Port Configuration

- **Frontend**: http://localhost:3001
- **Backend**: https://jewgo-app-oyoh.onrender.com (Render)

## Architecture

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   Docker        │ ────────────────► │   Render        │
│   Frontend      │                  │   Backend       │
│   (Port 3001)   │                  │   (Production)  │
└─────────────────┘                  └─────────────────┘
```

## Benefits

### ✅ Advantages
- **Consistent Environment**: Same Docker setup across all developers
- **Isolated Testing**: Test frontend changes without affecting production
- **Fast Development**: No need to run local backend services
- **Production-like**: Uses the same backend as production
- **Easy Setup**: One command to get everything running

### ⚠️ Considerations
- **Network Dependency**: Requires internet connection to reach Render backend
- **Backend Changes**: Can't test backend changes locally
- **Latency**: Slightly higher latency due to network calls to Render

## Usage

### Starting the Environment

```bash
# Start frontend with Render backend
./scripts/docker-setup.sh frontend-only
```

### Stopping the Environment

```bash
# Stop all services
docker-compose -f docker-compose.frontend-only.yml down
```

### Viewing Logs

```bash
# View frontend logs
docker-compose -f docker-compose.frontend-only.yml logs -f frontend

# View all logs
docker-compose -f docker-compose.frontend-only.yml logs -f
```

### Restarting Services

```bash
# Restart frontend
docker-compose -f docker-compose.frontend-only.yml restart frontend

# Restart all services
docker-compose -f docker-compose.frontend-only.yml restart
```

## Development Workflow

### 1. Make Frontend Changes
```bash
# Edit frontend files
# Changes are reflected immediately in the running container
```

### 2. Test Changes
```bash
# Open browser to http://localhost:3001
# Test your changes with the production backend
```

### 3. Debug Issues
```bash
# View logs for debugging
docker-compose -f docker-compose.frontend-only.yml logs -f frontend
```

### 4. Rebuild if Needed
```bash
# If you change dependencies or need a fresh build
docker-compose -f docker-compose.frontend-only.yml build --no-cache frontend
docker-compose -f docker-compose.frontend-only.yml up -d
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 3001
lsof -i :3001

# Stop conflicting services
# Or change port in docker-compose.frontend-only.yml
```

#### 2. Frontend Won't Start
```bash
# Check logs
docker-compose -f docker-compose.frontend-only.yml logs frontend

# Check environment variables
cat frontend/.env.local
```

#### 3. Can't Connect to Backend
```bash
# Test backend connectivity
curl https://jewgo-app-oyoh.onrender.com/health

# Check if backend is running on Render
```

#### 4. Environment Variables Missing
```bash
# Create environment file from example
cp frontend/env.example frontend/.env.local

# Edit with your values
nano frontend/.env.local
```

### Health Checks

```bash
# Test frontend
curl http://localhost:3001

# Test backend connection
curl https://jewgo-app-oyoh.onrender.com/health
```

## Comparison with Full Setup

| Feature | Frontend-Only | Full Setup |
|---------|---------------|------------|
| **Backend** | Render (Production) | Local Docker |
| **Database** | Render (Production) | Local PostgreSQL |
| **Redis** | Render (Production) | Local Redis |
| **Setup Time** | ~2 minutes | ~5 minutes |
| **Resource Usage** | Low | High |
| **Network Dependency** | Yes | No |
| **Backend Testing** | No | Yes |
| **Production Parity** | High | Medium |

## Best Practices

1. **Use for Frontend Development**: Perfect for UI/UX changes and frontend features
2. **Test with Production Data**: Uses real production backend and data
3. **Keep Environment Updated**: Regularly pull latest changes
4. **Monitor Logs**: Watch logs for any connection issues
5. **Backup Environment**: Save your `.env.local` configuration

## Next Steps

Once you're comfortable with the frontend-only setup, you can:

1. **Add Backend Development**: Use `./scripts/docker-setup.sh full` for complete local development
2. **Customize Environment**: Modify `docker-compose.frontend-only.yml` for your needs
3. **Add Services**: Add Redis, PostgreSQL, or other services as needed
4. **Production Deployment**: Use the same Docker setup for production deployment

## Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.frontend-only.yml logs -f`
2. Verify environment variables: `cat frontend/.env.local`
3. Test backend connectivity: `curl https://jewgo-app-oyoh.onrender.com/health`
4. Restart services: `docker-compose -f docker-compose.frontend-only.yml restart`
