# Webhook Deployment Fix - Complete Solution

## 🎯 **Problem Solved:**

The GitHub webhook auto-deploy was not working due to Docker container configuration issues. This document provides the complete solution.

## 🔍 **Root Cause Analysis:**

### **Issues Identified:**
1. **Working Directory Mismatch**: Container used `/app` but git repo was at `/home/ubuntu`
2. **Missing Git Access**: Container couldn't access the host's git repository
3. **Environment Variable**: `APP_WORKDIR` pointed to wrong directory
4. **User Permissions**: Container user didn't match host user permissions

### **Webhook Status Before Fix:**
```json
{
  "git_installed": false,
  "git_repo_exists": false,
  "webhook_configured": true,
  "workdir": "/app"
}
```

## 🛠️ **Solution Implemented:**

### **1. New Dockerfile (`backend/Dockerfile.webhook`):**
```dockerfile
# Key changes:
- WORKDIR /home/ubuntu  # Match host directory
- Install git in container
- Create ubuntu user (UID 1000) to match host
- Set proper permissions
```

### **2. Updated Docker Compose (`docker-compose.webhook.yml`):**
```yaml
# Key changes:
- Mount entire /home/ubuntu directory
- Mount .git repository specifically
- Set APP_WORKDIR=/home/ubuntu
- Use webhook-enabled Dockerfile
```

### **3. Automated Fix Script (`fix_webhook_deployment.sh`):**
- Stops current backend container
- Backs up existing configuration
- Updates to webhook-enabled configuration
- Rebuilds container with proper settings
- Tests webhook functionality

## 🚀 **Deployment Instructions:**

### **When Server is Back Online:**

1. **Upload the fix files to server:**
   ```bash
   rsync -avz backend/Dockerfile.webhook ubuntu@141.148.50.111:/home/ubuntu/backend/
   rsync -avz docker-compose.webhook.yml ubuntu@141.148.50.111:/home/ubuntu/
   rsync -avz fix_webhook_deployment.sh ubuntu@141.148.50.111:/home/ubuntu/
   ```

2. **Run the fix script:**
   ```bash
   ssh ubuntu@141.148.50.111
   cd /home/ubuntu
   chmod +x fix_webhook_deployment.sh
   ./fix_webhook_deployment.sh
   ```

3. **Verify webhook is working:**
   ```bash
   curl -s https://api.jewgo.app/webhook/status | jq .
   ```

### **Expected Result:**
```json
{
  "git_installed": true,
  "git_repo_exists": true,
  "webhook_configured": true,
  "workdir": "/home/ubuntu"
}
```

## 🔧 **Technical Details:**

### **Container Configuration:**
- **Working Directory**: `/home/ubuntu` (matches host)
- **User**: `ubuntu` (UID 1000, matches host)
- **Git Access**: Full access to host git repository
- **Environment**: `APP_WORKDIR=/home/ubuntu`

### **Volume Mounts:**
```yaml
volumes:
  - /home/ubuntu:/home/ubuntu          # Full directory access
  - /home/ubuntu/.git:/home/ubuntu/.git # Git repository access
```

### **Webhook Endpoints:**
- **Deploy**: `https://api.jewgo.app/webhook/deploy`
- **Status**: `https://api.jewgo.app/webhook/status`

## 🧪 **Testing:**

### **Test Webhook Status:**
```bash
curl -s https://api.jewgo.app/webhook/status | jq .
```

### **Test Webhook Deployment:**
```bash
# Simulate GitHub webhook
curl -X POST https://api.jewgo.app/webhook/deploy \
  -H "X-Hub-Signature-256: sha256=..." \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main"}'
```

### **Test Manual Deployment:**
```bash
./deploy_manual.sh
```

## 📊 **Benefits:**

1. **✅ Automatic Deployments**: GitHub pushes trigger automatic deployments
2. **✅ Git Access**: Container has full access to git repository
3. **✅ Proper Permissions**: User permissions match host system
4. **✅ Rollback Capability**: Original configuration backed up
5. **✅ Health Monitoring**: Webhook status endpoint for monitoring

## 🔄 **Rollback Instructions:**

If issues occur, rollback to original configuration:
```bash
cd /home/ubuntu
docker-compose down backend
cp docker-compose.yml.backup.* docker-compose.yml
cp backend/Dockerfile.backup.* backend/Dockerfile
docker-compose up -d backend
```

## 📋 **Files Created:**

1. `backend/Dockerfile.webhook` - Webhook-enabled Dockerfile
2. `docker-compose.webhook.yml` - Updated Docker Compose configuration
3. `fix_webhook_deployment.sh` - Automated fix script
4. `WEBHOOK_DEPLOYMENT_FIX.md` - This documentation

## 🎉 **Expected Outcome:**

After applying this fix:
- ✅ GitHub webhook auto-deploy will work
- ✅ Container will have access to git repository
- ✅ Webhook status will show all green
- ✅ Automatic deployments on push to main branch
- ✅ Manual deployment script still available as backup

---
**Status**: Ready for deployment when server is back online
**Next Steps**: Upload files and run fix script
**Backup**: Original configuration preserved
