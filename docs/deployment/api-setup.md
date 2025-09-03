# 🚀 api.jewgo.app PostgreSQL Setup Guide for JewGo

## 📋 **Step-by-Step Setup**

### **Step 1: Create Database Account**

1. **Use your api.jewgo.app PostgreSQL service**
2. **Click "Sign Up"** (recommended: use GitHub for easy signup)
3. **Complete the signup process**

### **Step 2: Create New Project**

1. **Click "New Project"**
2. **Fill in project details:**
   - **Project Name:** `jewgo-database` (or your preferred name)
   - **Region:** Choose closest to your users (e.g., US East for US users)
   - **Compute:** Free tier (default)
3. **Click "Create Project"**

### **Step 3: Get Your Database URL**

1. **In your api.jewgo.app dashboard**, click on your project
2. **Go to "Connection Details"** tab
3. **Copy the connection string** - it will look like:
   ```
   postgresql://username:password@api.jewgo.app:5432/database_name
   ```

### **Step 4: Configure Your Environment**

1. **Open the `env.local` file** in your project
2. **Replace the DATABASE_URL** with your api.jewgo.app connection string:
   ```bash
   DATABASE_URL=postgresql://your_actual_username:your_actual_password@api.jewgo.app:5432/your_database_name
   ```

### **Step 5: Run the Setup Script**

```bash
# Make sure you're in the project directory
cd "/Users/mendell/jewgo app"

# Activate virtual environment
source venv/bin/activate

# Run the setup script
python backend/database/setup_api_database.py
```

### **Step 6: What the Script Will Do**

✅ **Test api.jewgo.app PostgreSQL connection**  
✅ **Create database tables**  
✅ **Migrate your 278 restaurants from SQLite**  
✅ **Verify data integrity**  
✅ **Test API endpoints**  

## 🎯 **Expected Output**

When successful, you should see:
```
🚀 Setting up api.jewgo.app PostgreSQL for JewGo
==================================================
✅ Found api.jewgo.app database URL: postgresql://...
🔍 Testing api.jewgo.app PostgreSQL connection...
✅ api.jewgo.app PostgreSQL connection successful!
🔨 Creating database tables...
✅ Database tables created successfully!

📊 Database Information:
   Total Restaurants: 278
   Active Restaurants: 278
   Categories: 10
   States: 7
   Agencies: 4

🎉 api.jewgo.app PostgreSQL setup complete!
```

## 🧪 **Testing Your Setup**

### **Test the API:**
```bash
# Start the production Flask app
python app_production.py

# In another terminal, test endpoints
curl http://localhost:8081/
curl http://localhost:8081/health
curl http://localhost:8081/api/restaurants
```

### **Test with Frontend:**
```bash
# Start the frontend (if not already running)
cd jewgo-frontend
npm run dev
```

## 🔧 **Troubleshooting**

### **Connection Issues:**
- ✅ **Check your DATABASE_URL format**
- ✅ **Verify your api.jewgo.app project is active**
- ✅ **Check network connectivity**
- ✅ **Ensure you copied the full connection string**

### **Migration Issues:**
- ✅ **Make sure your SQLite database exists**
- ✅ **Check that the old database manager can connect**
- ✅ **Verify the new PostgreSQL database is accessible**

### **Common Error Messages:**

**"api.jewgo.app PostgreSQL URL not found!"**
- Solution: Update the DATABASE_URL in `env.local` file

**"Failed to connect to api.jewgo.app PostgreSQL"**
- Solution: Check your connection string and network

**"Database tables created successfully!"**
- ✅ This is good! Your database is ready

## 📊 **api.jewgo.app Dashboard Features**

Once set up, you can use the api.jewgo.app dashboard to:
- **Monitor database performance**
- **View query logs**
- **Manage connections**
- **Scale your database**
- **Backup and restore data**

## 🚀 **Production Deployment**

After api.jewgo.app setup, you can deploy to:

### **Render (Recommended):**
1. Connect your GitHub repository
2. Create new Web Service
3. Set environment variables:
   - `DATABASE_URL`: Your api.jewgo.app connection string
   - `FLASK_ENV`: `production`
   - `CORS_ORIGINS`: Your frontend domain

### **Railway:**
1. Connect your GitHub repository
2. Add Web Service
3. Set environment variables in Railway dashboard

### **Fly.io:**
1. Install Fly CLI
2. Create app with `fly launch`
3. Set environment variables with `fly secrets set`

## 🎉 **Success Indicators**

✅ **api.jewgo.app PostgreSQL connection successful**  
✅ **Database tables created**  
✅ **278 restaurants migrated**  
✅ **API endpoints responding**  
✅ **Frontend connecting to backend**  

---

**Your JewGo app is now running on production-ready PostgreSQL! 🚀** 
