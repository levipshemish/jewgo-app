# JewGo Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with the JewGo application.

## Quick Diagnostic Commands

### Check System Status
```bash
# Check Python version (should be 3.11.8+)
python3 --version

# Check Node.js version (should be 22.x)
node --version

# Check npm version
npm --version

# Check if PostgreSQL is running
pg_isready

# Check if ports are in use
lsof -i :3000  # Frontend (standard)
lsof -i :3001  # Frontend (optimized compose)
lsof -i :5000  # Backend (container/internal or non-optimized)
lsof -i :5001  # Backend (optimized compose)
lsof -i :5432  # Database port
```

### Check Application Health
```bash
# Backend health check (try whichever applies)
curl http://localhost:5001/health   # optimized compose
curl http://localhost:5000/health   # non-optimized/full compose or direct run
curl https://jewgo-app-oyoh.onrender.com/health

# Frontend health check
curl http://localhost:3000/api/health
curl https://jewgo-app.vercel.app/api/health
```

## Common Issues and Solutions

### 1. Database Connection Issues

#### Problem: Cannot connect to database
```
Error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Ubuntu
   sudo systemctl status postgresql
   ```

2. **Start PostgreSQL if not running:**
   ```bash
   # macOS
   brew services start postgresql
   
   # Ubuntu
   sudo systemctl start postgresql
   ```

3. **Verify database exists:**
   ```bash
   psql -l | grep jewgo_db
   ```

4. **Create database if missing:**
   ```bash
   createdb jewgo_db
   ```

5. **Check DATABASE_URL format:**
   ```bash
   # Should be in format:
   DATABASE_URL=postgresql://username:password@localhost:5432/jewgo_db
   ```

#### Problem: Permission denied for database
```
Error: permission denied for database "jewgo_db"
```

**Solutions:**

1. **Create database user:**
   ```bash
   sudo -u postgres createuser --interactive
   ```

2. **Grant permissions:**
   ```bash
   sudo -u postgres psql
   GRANT ALL PRIVILEGES ON DATABASE jewgo_db TO your_username;
   ```

### 2. Backend Issues

#### Problem: Flask app won't start
```
Error: No module named 'flask'
```

**Solutions:**

1. **Activate virtual environment:**
   ```bash
   cd backend
   source venv_py311/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Check Python path:**
   ```bash
   which python
   # Should point to venv_py311/bin/python
   ```

#### Problem: Import errors
```
ModuleNotFoundError: No module named 'config'
```

**Solutions:**

1. **Check working directory:**
   ```bash
   pwd
   # Should be in backend/ directory
   ```

2. **Set PYTHONPATH:**
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

3. **Run from correct directory:**
   ```bash
   cd backend
   python app.py
   ```

#### Problem: Port already in use
```
Error: [Errno 48] Address already in use
```

**Solutions:**

1. **Find process using port:**
   ```bash
   lsof -i :5000
   ```

2. **Kill the process:**
   ```bash
   kill -9 <PID>
   ```

3. **Use different port:**
   ```bash
   PORT=5001 python app.py
   ```

### 3. Frontend Issues

#### Problem: Next.js build fails
```
Error: Cannot find module 'react'
```

**Solutions:**

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Problem: Environment variables not loading
```
Error: NEXT_PUBLIC_BACKEND_URL is undefined
```

**Solutions:**

1. **Check .env.local file:**
   ```bash
   cat frontend/.env.local
   ```

2. **Restart development server:**
   ```bash
   npm run dev
   ```

3. **Verify variable names:**
   ```bash
   # Should start with NEXT_PUBLIC_ for client-side access
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```

#### Problem: API calls failing
```
Error: Failed to fetch
```

**Solutions:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check CORS configuration:**
   ```bash
   # In backend/.env
   CORS_ORIGINS=http://localhost:3000
   ```

3. **Check network tab in browser:**
   - Open Developer Tools
   - Check Network tab for failed requests

### 4. Authentication Issues

#### Problem: API key authentication failing
```
Error: 401 Unauthorized
```

**Solutions:**

1. **Check API key in headers:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:5000/api/restaurants
   ```

2. **Verify token in environment:**
   ```bash
   echo $ADMIN_TOKEN
   ```

3. **Check token format:**
   ```bash
   # Should be a valid token string
   ADMIN_TOKEN=your-secure-admin-token
   ```

#### Problem: NextAuth not working
```
Error: Invalid credentials
```

**Solutions:**

1. **Check NEXTAUTH_SECRET:**
   ```bash
   # Should be set in .env.local
   NEXTAUTH_SECRET=your-secure-secret
   ```

2. **Check NEXTAUTH_URL:**
   ```bash
   # Should match your frontend URL
   NEXTAUTH_URL=http://localhost:3000
   ```

### 5. Google API Issues

#### Problem: Google Places API errors
```
Error: REQUEST_DENIED
```

**Solutions:**

1. **Check API key:**
   ```bash
   echo $GOOGLE_PLACES_API_KEY
   ```

2. **Enable Google Places API:**
   - Go to Google Cloud Console
   - Enable Places API
   - Enable Maps JavaScript API

3. **Check billing:**
   - Ensure billing is enabled
   - Check quota limits

4. **Verify API key restrictions:**
   - Check if key is restricted to specific domains
   - Add localhost for development

### 6. Image Upload Issues

#### Problem: Cloudinary upload failing
```
Error: Invalid cloud name
```

**Solutions:**

1. **Check Cloudinary credentials:**
   ```bash
   echo $CLOUDINARY_CLOUD_NAME
   echo $CLOUDINARY_API_KEY
   echo $CLOUDINARY_API_SECRET
   ```

2. **Verify cloud name format:**
   ```bash
   # Should be your cloud name, not full URL
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   ```

3. **Test Cloudinary connection:**
   ```python
   import cloudinary
   cloudinary.config(
       cloud_name="your-cloud-name",
       api_key="your-api-key",
       api_secret="your-api-secret"
   )
   ```

### 7. Performance Issues

#### Problem: Slow page loads
```
Page takes >5 seconds to load
```

**Solutions:**

1. **Check database queries:**
   ```bash
   # Enable query logging in PostgreSQL
   ALTER SYSTEM SET log_statement = 'all';
   SELECT pg_reload_conf();
   ```

2. **Check bundle size:**
   ```bash
   cd frontend
   npm run analyze
   ```

3. **Optimize images:**
   - Use Next.js Image component
   - Implement lazy loading
   - Compress images

#### Problem: High memory usage
```
Memory usage >80%
```

**Solutions:**

1. **Check memory usage:**
   ```bash
   top
   htop
   ```

2. **Optimize database connections:**
   ```python
   # In backend config
   SQLALCHEMY_ENGINE_OPTIONS = {
       'pool_size': 10,
       'pool_recycle': 3600,
   }
   ```

3. **Implement caching:**
   - Add Redis for caching
   - Cache frequently accessed data

### 8. Deployment Issues

#### Problem: Render deployment fails
```
Build failed: pip install failed
```

**Solutions:**

1. **Check requirements.txt:**
   ```bash
   # Ensure all dependencies are listed
   cat backend/requirements.txt
   ```

2. **Check Python version:**
   ```bash
   # In render.yaml
   PYTHON_VERSION: 3.11.8
   ```

3. **Check build logs:**
   - Go to Render dashboard
   - Check build logs for specific errors

#### Problem: Vercel deployment fails
```
Build failed: npm run build failed
```

**Solutions:**

1. **Check build command:**
   ```bash
   # In vercel.json
   "buildCommand": "cd frontend && npm install && npm run build"
   ```

2. **Check environment variables:**
   - Verify all required variables are set
   - Check variable names match code

3. **Check Node.js version:**
   ```bash
   # In package.json
   "engines": {
     "node": "22.x"
   }
   ```

## Debug Mode

### Enable Debug Mode

1. **Backend debug mode:**
   ```bash
   # In backend/.env
   DEBUG=True
   LOG_LEVEL=DEBUG
   ```

2. **Frontend debug mode:**
   ```bash
   # In frontend/.env.local
   NODE_ENV=development
   ```

3. **Database debug mode:**
   ```bash
   # In PostgreSQL
   ALTER SYSTEM SET log_statement = 'all';
   SELECT pg_reload_conf();
   ```

### Debug Tools

1. **Backend debugging:**
   ```bash
   # Use Python debugger
   import pdb; pdb.set_trace()
   
   # Use logging
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. **Frontend debugging:**
   ```javascript
   // Use browser console
   console.log('Debug info:', data);
   
   // Use React DevTools
   // Install React Developer Tools extension
   ```

3. **Database debugging:**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Check table structure
   \d restaurants
   
   # Check data
   SELECT * FROM restaurants LIMIT 5;
   ```

## Log Analysis

### Check Logs

1. **Backend logs:**
   ```bash
   # Check application logs
   tail -f backend/logs/app.log
   
   # Check error logs
   tail -f backend/logs/error.log
   ```

2. **Frontend logs:**
   ```bash
   # Check Next.js logs
   tail -f frontend/.next/server.log
   ```

3. **System logs:**
   ```bash
   # Check system logs
   journalctl -u postgresql
   journalctl -u nginx
   ```

### Common Log Patterns

1. **Database connection errors:**
   ```
   ERROR: connection to server failed
   ```

2. **Authentication errors:**
   ```
   ERROR: Invalid token
   ```

3. **API rate limiting:**
   ```
   ERROR: Rate limit exceeded
   ```

## Performance Monitoring

### Monitor Key Metrics

1. **Response times:**
   ```bash
   # Test API response time
   time curl http://localhost:5000/api/restaurants
   ```

2. **Database performance:**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

3. **Memory usage:**
   ```bash
   # Monitor memory usage
   free -h
   top -p $(pgrep -f "python.*app.py")
   ```

## Emergency Procedures

### Database Recovery

1. **Restore from backup:**
   ```bash
   pg_restore -d jewgo_db backup.dump
   ```

2. **Reset database:**
   ```bash
   dropdb jewgo_db
   createdb jewgo_db
   python -m alembic upgrade head
   ```

### Application Recovery

1. **Restart services:**
   ```bash
   # Kill all processes
   pkill -f "python.*app.py"
   pkill -f "next"
   
   # Restart
   ./start-dev.sh
   ```

2. **Clear caches:**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Clear Python cache
   find . -type d -name "__pycache__" -exec rm -rf {} +
   ```

## Getting Help

### Before Asking for Help

1. **Check this guide**
2. **Search existing issues**
3. **Check logs for errors**
4. **Try debug mode**
5. **Document the issue**

### When Asking for Help

Include:
- Error message
- Steps to reproduce
- Environment details
- Logs
- What you've tried

### Support Channels

- GitHub Issues
- Documentation
- Community forums
- Email support

## Prevention

### Best Practices

1. **Regular backups**
2. **Monitor logs**
3. **Test deployments**
4. **Keep dependencies updated**
5. **Document changes**

### Monitoring Setup

1. **Health checks**
2. **Error tracking**
3. **Performance monitoring**
4. **Alerting**
5. **Log aggregation** 
