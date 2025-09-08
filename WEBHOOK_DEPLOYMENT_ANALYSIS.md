# GitHub Webhook Auto-Deploy Analysis

## 🔍 **Issue Identified:**

The GitHub webhook auto-deploy is not working due to a **Docker container working directory mismatch**.

### **Root Cause:**
- The backend Docker container uses `/app` as the working directory
- The webhook endpoint expects to find the git repository at the working directory
- The git repository is located at `/home/ubuntu` on the host
- The container cannot access the host's git repository from `/app`

### **Current Status:**
```json
{
  "git_installed": false,
  "git_repo_exists": false,
  "webhook_configured": true,
  "workdir": "/app"
}
```

## 🛠️ **Solutions:**

### **Option 1: Manual Deployment (Current Workaround)**
- Created `/home/ubuntu/deploy_manual.sh` script
- Run manually: `./deploy_manual.sh`
- Pulls latest changes and restarts backend

### **Option 2: Fix Docker Container (Recommended)**
1. **Mount git repository into container:**
   ```yaml
   volumes:
     - /home/ubuntu:/home/ubuntu
     - /home/ubuntu/.git:/app/.git
   ```

2. **Update Dockerfile working directory:**
   ```dockerfile
   WORKDIR /home/ubuntu
   ```

3. **Update environment variable:**
   ```bash
   APP_WORKDIR=/home/ubuntu
   ```

### **Option 3: External Deployment Service**
- Use GitHub Actions to trigger deployment
- SSH into server and run deployment commands
- More reliable than webhooks

## 📋 **Current Deployment Process:**

### **Manual Deployment:**
```bash
# On server
cd /home/ubuntu
./deploy_manual.sh
```

### **What the script does:**
1. Pulls latest changes from GitHub
2. Restarts backend service
3. Waits for backend to be ready
4. Tests backend health
5. Reports success/failure

## 🔧 **Webhook Configuration:**

### **Current Webhook Endpoint:**
- **URL**: `https://api.jewgo.app/webhook/deploy`
- **Secret**: Configured in environment
- **Events**: Push to main branch

### **Webhook Status Endpoint:**
- **URL**: `https://api.jewgo.app/webhook/status`
- **Returns**: Configuration and git status

## 🚀 **Recommendations:**

1. **Immediate**: Use manual deployment script for now
2. **Short-term**: Fix Docker container to mount git repository
3. **Long-term**: Consider GitHub Actions for more reliable deployments

## 📊 **Testing:**

### **Test Manual Deployment:**
```bash
ssh ubuntu@141.148.50.111 "cd /home/ubuntu && ./deploy_manual.sh"
```

### **Test Webhook Status:**
```bash
curl -s https://api.jewgo.app/webhook/status | jq .
```

### **Test Webhook Endpoint:**
```bash
curl -X POST https://api.jewgo.app/webhook/deploy \
  -H "X-Hub-Signature-256: sha256=..." \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main"}'
```

---
**Status**: Webhook not working due to Docker container configuration
**Workaround**: Manual deployment script available
**Next Steps**: Fix Docker container or implement GitHub Actions
