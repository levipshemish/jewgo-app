# Server Recovery Plan - Complete Solution Ready

## 🚨 **Current Status:**
- **Server**: `141.148.50.111` is currently unreachable (100% packet loss)
- **SSH**: Connection failing (likely server restart in progress)
- **Backend**: Not accessible (expected during server restart)
- **Solution**: Complete webhook fix ready for deployment

## 🎯 **What's Ready:**

### **✅ Complete Webhook Fix Solution:**
1. **`backend/Dockerfile.webhook`** - Fixed Dockerfile with proper working directory
2. **`docker-compose.webhook.yml`** - Updated Docker Compose with git access
3. **`fix_webhook_deployment.sh`** - Automated fix script
4. **`test_server_connection.sh`** - Server connection test and upload script
5. **`WEBHOOK_DEPLOYMENT_FIX.md`** - Complete documentation

### **✅ All Files Committed to GitHub:**
- All webhook fix files are saved and pushed to GitHub
- Ready for immediate deployment when server comes back online
- Complete rollback instructions included

## 🚀 **Recovery Steps (When Server is Back Online):**

### **Step 1: Test Server Connection**
```bash
# Run the connection test script
./test_server_connection.sh
```

### **Step 2: Apply Webhook Fix**
```bash
# SSH to server and run fix script
ssh ubuntu@141.148.50.111
cd /home/ubuntu
./fix_webhook_deployment.sh
```

### **Step 3: Verify Webhook is Working**
```bash
# Test webhook status
curl -s https://api.jewgo.app/webhook/status | jq .

# Expected result:
{
  "git_installed": true,
  "git_repo_exists": true,
  "webhook_configured": true,
  "workdir": "/home/ubuntu"
}
```

## 🔧 **What the Fix Does:**

### **Problem Solved:**
- **Before**: Container used `/app` working directory, couldn't access git repo
- **After**: Container uses `/home/ubuntu` working directory, full git access

### **Key Changes:**
1. **Working Directory**: Changed from `/app` to `/home/ubuntu`
2. **Git Access**: Container can now access host git repository
3. **User Permissions**: Container user matches host user (UID 1000)
4. **Environment**: `APP_WORKDIR=/home/ubuntu` set correctly
5. **Volume Mounts**: Full directory and git repository access

### **Backup System:**
- Original configuration automatically backed up
- Rollback instructions provided
- Safe deployment with recovery options

## 📊 **Expected Results After Fix:**

### **✅ Webhook Auto-Deploy:**
- GitHub pushes to main branch trigger automatic deployments
- No more manual deployment needed
- Real-time deployment status monitoring

### **✅ System Health:**
- Backend API: `https://api.jewgo.app/health` ✅
- HTTPS/SSL: Fully functional ✅
- Performance improvements: All active ✅
- Monitoring stack: Prometheus, Grafana, Node Exporter ✅

### **✅ Deployment Options:**
1. **Automatic**: GitHub webhook (primary)
2. **Manual**: `./deploy_manual.sh` (backup)
3. **Status Check**: `https://api.jewgo.app/webhook/status`

## 🔄 **Monitoring Server Status:**

### **Check Server Availability:**
```bash
# Test network connectivity
ping -c 3 141.148.50.111

# Test SSH connection
ssh -o ConnectTimeout=10 ubuntu@141.148.50.111 "echo 'SSH OK'"

# Test backend health
curl -s https://api.jewgo.app/health | jq .
```

### **Server Recovery Indicators:**
- ✅ Ping successful (0% packet loss)
- ✅ SSH connection established
- ✅ Backend health check passes
- ✅ Webhook status endpoint accessible

## 📋 **Files Ready for Deployment:**

1. **`backend/Dockerfile.webhook`** - Webhook-enabled Dockerfile
2. **`docker-compose.webhook.yml`** - Updated Docker Compose
3. **`fix_webhook_deployment.sh`** - Automated fix script
4. **`test_server_connection.sh`** - Connection test and upload
5. **`WEBHOOK_DEPLOYMENT_FIX.md`** - Complete documentation
6. **`SERVER_RECOVERY_PLAN.md`** - This recovery plan

## 🎉 **Success Criteria:**

After successful deployment:
- ✅ GitHub webhook auto-deploy working
- ✅ Container has git repository access
- ✅ Webhook status shows all green
- ✅ Backend health check passes
- ✅ All performance improvements active
- ✅ Monitoring stack operational

## 🆘 **Emergency Contacts:**

If server issues persist:
1. Check server provider dashboard
2. Verify server is running and accessible
3. Check firewall and network configuration
4. Review server logs for errors

---
**Status**: Complete solution ready for deployment
**Next Action**: Wait for server to come back online, then run fix script
**Backup**: All original configurations preserved
**Recovery**: Full rollback instructions available
