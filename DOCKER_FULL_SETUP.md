# 🐳 JewGo Full Docker Setup

Run the entire JewGo application stack in Docker containers!

## 🚀 Quick Start

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your Mac.

### 2. Build and Start Everything
```bash
# Build all containers
./scripts/docker-full.sh build

# Start all services
./scripts/docker-full.sh start
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 📋 Available Commands

```bash
./scripts/docker-full.sh build                    # Build all containers
./scripts/docker-full.sh start                    # Start all services
./scripts/docker-full.sh stop                     # Stop all services
./scripts/docker-full.sh restart                  # Restart all services
./scripts/docker-full.sh logs                     # Show all logs
./scripts/docker-full.sh logs frontend            # Show frontend logs
./scripts/docker-full.sh logs backend             # Show backend logs
./scripts/docker-full.sh status                   # Check service status
./scripts/docker-full.sh shell frontend           # Access frontend container
./scripts/docker-full.sh shell backend            # Access backend container
./scripts/docker-full.sh shell postgres           # Access database
./scripts/docker-full.sh migrate                  # Run database migrations
./scripts/docker-full.sh seed                     # Seed database with data
./scripts/docker-full.sh test backend             # Run backend tests
./scripts/docker-full.sh test frontend            # Run frontend tests
./scripts/docker-full.sh cleanup                  # Clean up everything
./scripts/docker-full.sh help                     # Show help
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│   (Database)    │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Cache)       │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 🔧 Services

### Frontend (Next.js)
- **Port**: 3000
- **Features**: Hot reloading, TypeScript, Tailwind CSS
- **Environment**: Development mode

### Backend (Flask)
- **Port**: 5000
- **Features**: REST API, database integration, caching
- **Dependencies**: PostgreSQL, Redis

### PostgreSQL (Database)
- **Port**: 5432
- **Database**: jewgo
- **User**: jewgo_user
- **Password**: jewgo_password

### Redis (Cache)
- **Port**: 6379
- **Features**: Session storage, caching

## 🛠️ Development Workflow

### 1. Start Everything
```bash
./scripts/docker-full.sh start
```

### 2. Make Changes
- Edit frontend code in `frontend/` - changes auto-reload
- Edit backend code in `backend/` - changes auto-reload
- Database changes persist in Docker volumes

### 3. Run Tests
```bash
# Backend tests
./scripts/docker-full.sh test backend

# Frontend tests
./scripts/docker-full.sh test frontend
```

### 4. Database Operations
```bash
# Run migrations
./scripts/docker-full.sh migrate

# Seed with sample data
./scripts/docker-full.sh seed
```

### 5. Debugging
```bash
# View logs
./scripts/docker-full.sh logs

# Access container shells
./scripts/docker-full.sh shell backend
./scripts/docker-full.sh shell frontend
```

## 🔍 Monitoring

### Check Service Status
```bash
./scripts/docker-full.sh status
```

### Health Checks
- Backend: http://localhost:5000/health
- Frontend: http://localhost:3000
- Database: Automatic via Docker health checks

### View Logs
```bash
# All services
./scripts/docker-full.sh logs

# Specific service
./scripts/docker-full.sh logs frontend
./scripts/docker-full.sh logs backend
```

## 🗄️ Database Management

### Run Migrations
```bash
./scripts/docker-full.sh migrate
```

### Seed Database
```bash
./scripts/docker-full.sh seed
```

### Access Database
```bash
# Connect to PostgreSQL
./scripts/docker-full.sh shell postgres
psql -U jewgo_user -d jewgo
```

### Backup/Restore
```bash
# Backup
docker-compose -f docker-compose.full.yml exec postgres pg_dump -U jewgo_user jewgo > backup.sql

# Restore
docker-compose -f docker-compose.full.yml exec -T postgres psql -U jewgo_user -d jewgo < backup.sql
```

## 🔧 Configuration

### Environment Variables
Environment policy:
- Root `.env` is the master source of truth for local dev and validation.
- Example files (e.g., `env.template`, `frontend/env.example`) are references only and must not contain real secrets.
- Validate consistency anytime:
  ```bash
  npm run env:check        # basic check
  npm run env:check:strict # also flags extra keys
  ```

### Volume Mounting
- Source code is mounted for hot reloading
- Database data persists in Docker volumes
- Environment files are mounted read-only

### Network
All services communicate via Docker network `jewgo-network`

## 🚨 Troubleshooting

### Services Won't Start
```bash
# Check Docker status
docker info

# Check logs
./scripts/docker-full.sh logs

# Restart everything
./scripts/docker-full.sh restart
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :5000
lsof -i :5432
lsof -i :6379

# Kill conflicting processes
lsof -ti:3000 | xargs kill -9
```

### Database Issues
```bash
# Reset database
./scripts/docker-full.sh cleanup
./scripts/docker-full.sh start
./scripts/docker-full.sh migrate
./scripts/docker-full.sh seed
```

### Container Issues
```bash
# Clean up and restart
./scripts/docker-full.sh cleanup
./scripts/docker-full.sh build
./scripts/docker-full.sh start
```

## 🎯 Benefits

- ✅ **Complete isolation** - Everything runs in containers
- ✅ **Consistent environment** - Same setup everywhere
- ✅ **Easy deployment** - Production-ready configuration
- ✅ **Hot reloading** - Development-friendly
- ✅ **Persistent data** - Database and cache persist
- ✅ **Easy scaling** - Add more containers as needed
- ✅ **Team collaboration** - Everyone has the same setup

## 🚀 Production Ready

This setup is production-ready with:
- Health checks for all services
- Proper networking between containers
- Persistent data storage
- Environment variable configuration
- Security best practices (non-root users)

## 📚 Next Steps

1. **Start the full stack** with `./scripts/docker-full.sh start`
2. **Explore the application** at http://localhost:3000
3. **Check the API** at http://localhost:5000
4. **Run tests** to verify everything works
5. **Customize configuration** as needed

Everything is now running in Docker! 🎉
