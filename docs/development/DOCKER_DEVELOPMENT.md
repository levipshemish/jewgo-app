# Docker Development Environment

This document explains how to use the Docker development environment for the JewGo app, which provides a consistent development environment with all necessary tools pre-installed.

## 🚀 Quick Start

### 1. Build the Docker Image
```bash
./scripts/dev-docker.sh build
```

### 2. Start Development Container
```bash
./scripts/dev-docker.sh start
```

### 3. Open a Shell
```bash
./scripts/dev-docker.sh shell
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `./scripts/dev-docker.sh build` | Build the Docker image |
| `./scripts/dev-docker.sh start` | Start a development container |
| `./scripts/dev-docker.sh shell` | Open a shell in the container |
| `./scripts/dev-docker.sh exec 'command'` | Execute a command in the container |
| `./scripts/dev-docker.sh stop` | Stop the container |
| `./scripts/dev-docker.sh remove` | Remove the container |
| `./scripts/dev-docker.sh status` | Show container status |
| `./scripts/dev-docker.sh help` | Show help message |

## 🛠️ Development Workflow

### Backend Development
```bash
# Start container and open shell
./scripts/dev-docker.sh start
./scripts/dev-docker.sh shell

# Inside container, run Flask backend
cd /home/ubuntu/jewgo-app/backend
python3.11 -m flask run

# Run tests
python3.11 -m pytest

# Run database migrations
python3.11 -m alembic upgrade head
```

### Frontend Development
```bash
# Start container and open shell
./scripts/dev-docker.sh start
./scripts/dev-docker.sh shell

# Inside container, run Next.js frontend
cd /home/ubuntu/jewgo-app/frontend
npm run dev
```

### Web Scraping Tasks
```bash
# Execute scraping commands
./scripts/dev-docker.sh exec 'cd /home/ubuntu/jewgo-app/backend && python3.11 scripts/maintenance/scrape_restaurants.py'
```

## 🔧 What's Included

### Python Environment (3.11.13)
- **Flask 2.3.3** - Web framework
- **SQLAlchemy 1.4.54** - ORM
- **Alembic 1.11.3** - Database migrations
- **Playwright 1.40.0** - Web scraping
- **Pytest 7.4.3** - Testing
- **Cloudinary 1.36.0** - Image uploads
- **psycopg2-binary 2.9.9** - PostgreSQL client

### Node.js Environment (22.18.0)
- **Next.js 15.4.6** - React framework
- **TypeScript 5.9.2** - Type safety
- **React 18.3.1** - UI library
- **Tailwind CSS 3.3.0** - Styling

### Development Tools
- **Git** - Version control
- **Vim/Nano** - Text editors
- **PostgreSQL client** - Database access
- **Build tools** - Compilation utilities

## 🌐 Port Mapping

The container maps the following ports:
- **3000** - Frontend (Next.js)
- **5000** - Backend (Flask)

## 📁 Volume Mounting

Your local project directory is mounted to `/home/ubuntu/jewgo-app` in the container, so:
- ✅ **Changes are synced** between host and container
- ✅ **Git history preserved** 
- ✅ **All files accessible** in both environments

## 🔍 Troubleshooting

### Container Won't Start
```bash
# Check if container exists
./scripts/dev-docker.sh status

# Remove and restart
./scripts/dev-docker.sh remove
./scripts/dev-docker.sh start
```

### Permission Issues
```bash
# Make sure script is executable
chmod +x scripts/dev-docker.sh
```

### Port Conflicts
If ports 3000 or 5000 are in use:
```bash
# Stop local services first
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

## 🎯 Use Cases

### 1. **Consistent Development Environment**
- Same environment across team members
- No "works on my machine" issues
- Easy onboarding for new developers

### 2. **Isolated Testing**
- Test changes without affecting local environment
- Run experiments safely
- Debug environment-specific issues

### 3. **CI/CD Preparation**
- Test in environment similar to production
- Verify deployment scripts
- Debug build issues

### 4. **Complex Tasks**
- Web scraping with Playwright
- Database migrations
- Performance testing
- Security audits

## 🔄 Alternative to Background Agents

Since background agents require Claude Sonnet 4+ access, this Docker environment provides:

- ✅ **All the same tools** as background agents
- ✅ **Consistent environment** for development
- ✅ **Easy command execution** via script
- ✅ **Full project access** with volume mounting
- ✅ **No subscription requirements**

## 📚 Next Steps

1. **Try the workflow** with a simple task
2. **Customize the environment** if needed
3. **Share with team members** for consistency
4. **Use for complex development tasks**

This Docker environment gives you the same capabilities as background agents, just with manual execution instead of AI automation! 