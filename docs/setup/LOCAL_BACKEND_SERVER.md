# 🖥️ Local Backend Server Setup

**Last Updated**: August 25, 2025  
**Status**: ✅ Fully Functional

## 🎯 Overview

The JewGo backend server is a Flask application that provides the API endpoints for the JewGo application. This guide covers how to run the backend server locally for development.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ installed
- Virtual environment already set up in `backend/.venv`
- Environment variables configured in root `.env` file

### Start the Server
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source .venv/bin/activate

# Start the server
python app.py
```

### Verify Server is Running
```bash
# Test health endpoint
curl http://localhost:8082/healthz

# Expected response:
{
  "message": "JewGo Backend is running",
  "status": "healthy",
  "success": true,
  "timestamp": "2025-08-25T15:37:35.910879+00:00"
}
```

## 📍 Server Details

### Port Configuration
- **Port**: 8082 (configured to avoid conflicts)
- **Host**: 0.0.0.0 (accessible from all interfaces)
- **Debug Mode**: Enabled for development

### Available Endpoints

#### Health Endpoints
- **`GET /healthz`** - Root health check
- **`GET /api/health/basic`** - Basic health check
- **`GET /api/v4/direct-test`** - API v4 test endpoint

#### API Endpoints
- **`GET /api/v4/...`** - API v4 routes (when registered)
- **`GET /api/v4-simple/...`** - Simple API v4 routes (when registered)

## 🔧 Configuration

### Environment Variables
The server requires environment variables from the root `.env` file:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ENVIRONMENT` - Set to "development" for local
- Other API keys and configuration

### App Factory Selection
The server uses `app_factory.py` (not `app_factory_full.py`) to avoid Sentry SDK import issues:
- Health endpoints are added directly to `app_factory.py`
- Full feature set available through registered blueprints
- Database warnings are expected in local development

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 8082
lsof -i :8082

# Kill the process if needed
pkill -f "python app.py"
```

#### Database Connection Error
```
Failed to initialize database manager: DATABASE_URL environment variable is required
```
**Solution**: This is expected in local development. The server will still run and serve endpoints.

#### Sentry SDK Import Error
```
ImportError: cannot import name 'Client' from partially initialized module 'sentry_sdk'
```
**Solution**: Use `app_factory.py` instead of `app_factory_full.py` (already configured).

### Debug Mode
The server runs in debug mode with:
- Auto-reload on code changes
- Detailed error messages
- Debugger PIN available in console

## 📊 Health Monitoring

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:8082/healthz

# API health check
curl http://localhost:8082/api/health/basic

# API v4 test
curl http://localhost:8082/api/v4/direct-test
```

### Expected Responses
All health endpoints should return:
```json
{
  "success": true,
  "status": "healthy",
  "message": "JewGo Backend is running",
  "timestamp": "2025-08-25T15:37:35.910879+00:00"
}
```

## 🔄 Development Workflow

### Making Changes
1. Edit code in the backend directory
2. Server auto-reloads in debug mode
3. Test endpoints immediately
4. Check logs in terminal

### Adding New Endpoints
1. Add routes to appropriate blueprint in `routes/` directory
2. Register blueprint in `app_factory.py` if needed
3. Test endpoint immediately
4. Update documentation

### Database Changes
1. Create migration scripts in `database/migrations/`
2. Test migrations locally
3. Update database schema documentation
4. Deploy with proper backup procedures

## 📝 Logging

### Log Levels
- **INFO**: General application flow
- **WARNING**: Non-critical issues
- **ERROR**: Critical errors and exceptions
- **DEBUG**: Detailed debugging information

### Log Format
Structured logging with:
- Timestamp
- Log level
- Module/function name
- Event details
- Context information

## 🔒 Security Notes

### Development Mode
- Debug mode enabled (not for production)
- CORS configured for local development
- Environment variables loaded from root `.env`
- No production secrets in local config

### Production Considerations
- Disable debug mode
- Configure proper CORS origins
- Use production environment variables
- Enable Sentry error tracking
- Configure proper logging levels

## 📚 Related Documentation

- **[QUICK_START.md](QUICK_START.md)** - Complete setup guide
- **[DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md)** - Development process
- **[API_ENDPOINTS_SUMMARY.md](../api/API_ENDPOINTS_SUMMARY.md)** - API documentation
- **[TROUBLESHOOTING_GUIDE.md](../TROUBLESHOOTING_GUIDE.md)** - Common issues and solutions

---

**Next Steps**: After starting the backend server, you can run the frontend and test the full application integration.
