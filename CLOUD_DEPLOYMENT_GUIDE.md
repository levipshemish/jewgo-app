# 🚀 **Cloud Deployment Guide: Neon + Supabase + Vercel + Render**

## 📋 **Infrastructure Overview**

Your JewGo app uses a modern cloud-native stack:

- **🟢 Neon**: PostgreSQL database (serverless, auto-scaling)
- **🟣 Supabase**: Backend-as-a-Service (auth, real-time, storage)
- **🟠 Vercel**: Frontend hosting (Next.js)
- **🔵 Render**: Backend API hosting (Flask + WebSocket)

## 🔧 **Step 1: Neon Database Setup**

### **1.1 Create Neon Database**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Note your connection details:
   ```
   Host: [your-host].neon.tech
   Database: [your-database]
   Username: [your-username]
   Password: [your-password]
   ```

### **1.2 Configure Neon Connection**
```bash
# Update your DATABASE_URL in config.env
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
```

### **1.3 Run Database Migration on Neon**
```bash
# Connect to Neon and run migration
cd backend
export DATABASE_URL="postgresql://[username]:[password]@[host]/[database]?sslmode=require"
python scripts/run_distance_migration.py
```

## 🔧 **Step 2: Supabase Configuration**

### **2.1 Supabase Project Setup**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys

### **2.2 Environment Variables**
```bash
# Add to your environment
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### **2.3 Supabase Features to Enable**
- **Authentication**: User management
- **Real-time**: Live updates
- **Storage**: Image uploads
- **Edge Functions**: Serverless functions

## 🔧 **Step 3: Render Backend Deployment**

### **3.1 Create Render Service**
1. Go to [render.com](https://render.com)
2. Create a new **Web Service**
3. Connect your GitHub repository

### **3.2 Render Configuration**
```yaml
# render.yaml
services:
  - type: web
    name: jewgo-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python app_factory.py
    envVars:
      - key: DATABASE_URL
        value: postgresql://[neon-connection-string]
      - key: REDIS_URL
        value: redis://[render-redis-url]
      - key: ENVIRONMENT
        value: production
      - key: SUPABASE_SERVICE_ROLE_KEY
        value: [your-supabase-service-role-key]
```

### **3.3 Redis on Render**
1. Create a **Redis** service on Render
2. Use the provided Redis URL in your configuration

### **3.4 Environment Variables for Render**
```bash
# Required environment variables
DATABASE_URL=postgresql://[neon-connection-string]
REDIS_URL=redis://[render-redis-url]
ENVIRONMENT=production
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-role-key]
SENTRY_DSN=[your-sentry-dsn]
```

## 🔧 **Step 4: Vercel Frontend Deployment**

### **4.1 Vercel Project Setup**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure as Next.js project

### **4.2 Vercel Environment Variables**
```bash
# Add these in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_WEBSOCKET_URL=wss://[render-backend-url]/ws
NEXT_PUBLIC_VERCEL_URL=https://[your-vercel-app].vercel.app
```

### **4.3 Vercel Configuration**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "NEXT_PUBLIC_WEBSOCKET_URL": "@websocket-url"
  }
}
```

## 🔧 **Step 5: Database Migration for Cloud**

### **5.1 Update Migration Script for Neon**
```python
# backend/scripts/run_cloud_migration.py
#!/usr/bin/env python3
"""
Cloud migration script for Neon PostgreSQL.
"""

import os
import sys
import psycopg2
from pathlib import Path

def run_cloud_migration():
    """Run migration on Neon database."""
    try:
        # Get database URL from environment
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
            return False
        
        print("🔗 Connecting to Neon database...")
        
        # Connect to Neon
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Read migration file
        migration_file = Path(__file__).parent.parent / "database" / "migrations" / "add_distance_filtering_indexes.sql"
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        # Split and execute SQL statements
        statements = sql_content.split(';')
        
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                print(f"Executing: {statement[:50]}...")
                cursor.execute(statement)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Cloud migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_cloud_migration()
    sys.exit(0 if success else 1)
```

### **5.2 Run Cloud Migration**
```bash
# Set environment variables
export DATABASE_URL="postgresql://[neon-connection-string]"

# Run migration
cd backend
python scripts/run_cloud_migration.py
```

## 🔧 **Step 6: Environment Configuration**

### **6.1 Production Environment File**
```bash
# backend/.env.production
DATABASE_URL=postgresql://[neon-connection-string]
REDIS_URL=redis://[render-redis-url]
ENVIRONMENT=production
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-role-key]
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_WEBSOCKET_URL=wss://[render-backend-url]/ws
SENTRY_DSN=[your-sentry-dsn]
```

### **6.2 Frontend Environment**
```bash
# frontend/.env.production
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_WEBSOCKET_URL=wss://[render-backend-url]/ws
NEXT_PUBLIC_VERCEL_URL=https://[your-vercel-app].vercel.app
```

## 🔧 **Step 7: Deployment Commands**

### **7.1 Backend Deployment (Render)**
```bash
# Deploy to Render
git add .
git commit -m "Deploy backend with cloud configuration"
git push origin main

# Render will automatically deploy from GitHub
```

### **7.2 Frontend Deployment (Vercel)**
```bash
# Deploy to Vercel
cd frontend
vercel --prod

# Or push to GitHub for automatic deployment
git add .
git commit -m "Deploy frontend with cloud configuration"
git push origin main
```

### **7.3 Database Migration (Neon)**
```bash
# Run migration on Neon
cd backend
export DATABASE_URL="postgresql://[neon-connection-string]"
python scripts/run_cloud_migration.py
```

## 🔧 **Step 8: Testing Cloud Setup**

### **8.1 Test Database Connection**
```bash
# Test Neon connection
psql "postgresql://[neon-connection-string]"
```

### **8.2 Test Backend API**
```bash
# Test Render backend
curl https://[render-backend-url]/api/health
curl https://[render-backend-url]/api/restaurants
```

### **8.3 Test Frontend**
```bash
# Test Vercel frontend
curl https://[your-vercel-app].vercel.app
```

### **8.4 Test WebSocket**
```bash
# Test WebSocket connection
wscat -c wss://[render-backend-url]/ws
```

## 🔧 **Step 9: Monitoring & Analytics**

### **9.1 Sentry Setup**
1. Create Sentry project
2. Add DSN to environment variables
3. Monitor errors and performance

### **9.2 Performance Monitoring**
```bash
# Monitor API performance
curl https://[render-backend-url]/api/performance/stats

# Monitor database performance
curl https://[render-backend-url]/api/health
```

### **9.3 Logs & Debugging**
- **Render**: View logs in Render dashboard
- **Vercel**: View logs in Vercel dashboard
- **Neon**: Monitor database performance
- **Supabase**: View real-time logs

## 🎯 **Production Checklist**

### **✅ Backend (Render)**
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Redis service running
- [ ] WebSocket endpoints working
- [ ] Health checks passing

### **✅ Frontend (Vercel)**
- [ ] Environment variables set
- [ ] Supabase integration working
- [ ] WebSocket connection established
- [ ] Mobile optimization enabled
- [ ] Performance monitoring active

### **✅ Database (Neon)**
- [ ] Spatial extensions installed
- [ ] Indexes created
- [ ] Connection string configured
- [ ] SSL enabled
- [ ] Performance optimized

### **✅ Supabase**
- [ ] Authentication configured
- [ ] Real-time features enabled
- [ ] Storage buckets created
- [ ] Row Level Security (RLS) configured
- [ ] API keys secured

## 🚀 **Deployment Commands Summary**

```bash
# 1. Set up environment
export DATABASE_URL="postgresql://[neon-connection-string]"
export REDIS_URL="redis://[render-redis-url]"

# 2. Run database migration
cd backend
python scripts/run_cloud_migration.py

# 3. Deploy backend to Render
git add .
git commit -m "Deploy backend"
git push origin main

# 4. Deploy frontend to Vercel
cd frontend
vercel --prod

# 5. Test deployment
curl https://[render-backend-url]/api/health
curl https://[your-vercel-app].vercel.app
```

---

**🎉 Your JewGo app is now ready for cloud deployment with Neon, Supabase, Vercel, and Render!**
