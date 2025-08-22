# Monitoring Update Action Plan

## 🎯 **Objective**
Update all external monitoring services to use the new backend URL: `https://jewgo-app-oyoh.onrender.com`

## 📋 **Action Items Checklist**

### ✅ **1. Sentry Configuration (Already Updated)**
- **Status:** ✅ Configured and working
- **DSN:** `https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288`
- **Dashboard:** https://us.sentry.io/
- **Action:** No changes needed - Sentry uses DSN, not URLs

### 🔄 **2. UptimeRobot (Manual Update Required)**
- **Current Status:** Needs manual update
- **Action Required:** 
  1. Login to UptimeRobot dashboard
  2. Update monitor URLs:
     - Health check: `https://jewgo-app-oyoh.onrender.com/health`
     - API check: `https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1`
     - Frontend check: `https://jewgo-app.vercel.app/`
  3. Update alert settings if needed
  4. Test monitors after update

### 🔄 **3. Cronitor (Manual Update Required)**
- **Current Status:** Needs manual update (if configured)
- **Action Required:**
  1. Login to Cronitor dashboard
  2. Update heartbeat URLs to new backend URL
  3. Update any API health checks
  4. Verify monitoring is working

### 🔄 **4. Custom Monitoring Scripts (Already Updated)**
- **Status:** ✅ Updated
- **Files Updated:**
  - `scripts/deployment/setup_monitoring.sh` ✅
  - `scripts/deployment/setup_keep_alive.sh` ✅
  - `docs/features/monitoring.md` ✅

### 🔄 **5. GitHub Actions (Already Updated)**
- **Status:** ✅ Updated
- **Files Updated:**
  - `.github/workflows/ci.yml` ✅
  - `.github/workflows/premerge-guard.yml` ✅

### 🔄 **6. Environment Variables (Already Updated)**
- **Status:** ✅ Updated
- **Files Updated:**
  - All Docker Compose files ✅
  - Environment templates ✅
  - Netlify/Vercel configs ✅

## 🚀 **Immediate Actions Required**

### **Step 1: Update UptimeRobot**
```bash
# Test endpoints before updating
curl "https://jewgo-app-oyoh.onrender.com/health"
curl "https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1"
curl "https://jewgo-app.vercel.app/"
```

**Manual Steps:**
1. Go to https://uptimerobot.com/dashboard
2. Find JewGo monitors
3. Update URLs to new backend URL
4. Test monitors

### **Step 2: Update Cronitor (if configured)**
```bash
# Test endpoints
curl "https://jewgo-app-oyoh.onrender.com/health"
```

**Manual Steps:**
1. Go to Cronitor dashboard
2. Update heartbeat URLs
3. Verify monitoring

### **Step 3: Set Up Ongoing Monitoring**

#### **Automated Health Checks**
```bash
# Run the monitoring setup script
bash scripts/deployment/setup_monitoring.sh

# Set up cron job for keep-alive (optional)
# Add to crontab: */5 * * * * /path/to/scripts/deployment/setup_keep_alive.sh
```

#### **Performance Monitoring**
```bash
# Test key endpoints
curl -w "@curl-format.txt" "https://jewgo-app-oyoh.onrender.com/health"
curl -w "@curl-format.txt" "https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1"
```

## 📊 **Monitoring Dashboard Setup**

### **Sentry Dashboard**
- **URL:** https://us.sentry.io/
- **Project:** JewGo
- **Environment:** Production
- **Status:** ✅ Active

### **Performance Metrics to Track**
- **Response Time:** Target < 2 seconds
- **Uptime:** Target > 99.9%
- **Error Rate:** Target < 1%
- **API Success Rate:** Target > 99%

## 🔍 **Verification Commands**

### **Daily Health Checks**
```bash
# Backend health
curl "https://jewgo-app-oyoh.onrender.com/health"

# API functionality
curl "https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1"

# Frontend status
curl -I "https://jewgo-app.vercel.app/"

# Database connectivity (through API)
curl "https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1" | jq '.restaurants | length'
```

### **Performance Testing**
```bash
# Response time test
curl -w "Time: %{time_total}s\n" "https://jewgo-app-oyoh.onrender.com/health"

# Load test (simple)
for i in {1..10}; do
  curl -s "https://jewgo-app-oyoh.onrender.com/health" > /dev/null
  echo "Request $i completed"
done
```

## 📈 **24-48 Hour Monitoring Plan**

### **Hour 0-6: Immediate Monitoring**
- [ ] Verify all endpoints responding
- [ ] Check Sentry for new errors
- [ ] Monitor response times
- [ ] Verify frontend-backend communication

### **Hour 6-24: Extended Monitoring**
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify database connectivity
- [ ] Monitor user traffic patterns

### **Hour 24-48: Performance Analysis**
- [ ] Analyze response time trends
- [ ] Review error patterns
- [ ] Check resource usage
- [ ] Optimize if needed

## 🚨 **Alert Thresholds**

### **Critical Alerts**
- **Uptime < 99%** - Immediate action required
- **Response Time > 5 seconds** - Performance issue
- **Error Rate > 5%** - System instability
- **Database Connection Failed** - Critical issue

### **Warning Alerts**
- **Response Time > 2 seconds** - Monitor closely
- **Error Rate > 1%** - Investigate
- **Memory Usage > 80%** - Resource warning

## 📞 **Emergency Contacts**

### **If Issues Arise:**
1. **Check Sentry Dashboard** for error details
2. **Verify Health Endpoints** using curl commands
3. **Check Render Dashboard** for backend status
4. **Check Vercel Dashboard** for frontend status
5. **Review Recent Deployments** for potential issues

## ✅ **Completion Checklist**

- [ ] UptimeRobot monitors updated
- [ ] Cronitor monitors updated (if configured)
- [ ] Sentry dashboard verified working
- [ ] Health endpoints tested
- [ ] Performance baseline established
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified of URL change

---

**Next Review:** 48 hours after migration  
**Responsible:** Development Team  
**Last Updated:** August 22, 2025
