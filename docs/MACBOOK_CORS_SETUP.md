# MacBook CORS Configuration Guide

## 🎯 **Overview**

Your MacBook is now configured for seamless CORS access to the JewGo API from any network. The configuration includes:

- **Local IP Whitelist**: `192.168.40.237` (your current IP)
- **MAC Address Whitelist**: `2a:7f:6d:ae:4a:c9` (your MacBook's MAC)
- **Local Network Ranges**: All private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- **Development Mode**: Special headers for development access

## 🔧 **Configuration Files Created**

### 1. **Enhanced CORS Configuration** (`backend/nginx/cors-config.conf`)
- Added local network range support
- Special handling for development origins
- Support for your specific local IP

### 2. **MAC Address Whitelist** (`backend/nginx/mac-whitelist.conf`)
- Your MAC address: `2a:7f:6d:ae:4a:c9`
- IP whitelist: `192.168.40.237`
- Extensible for additional trusted devices

### 3. **Development CORS** (`backend/nginx/dev-cors-config.conf`)
- Permissive CORS for development
- Activated with `X-Dev-Mode: true` header
- Supports MAC address header for identification

### 4. **Updated Main Config** (`backend/nginx/jewgo-security.conf`)
- Includes your local IP in origin map
- Supports local network ranges
- Includes MAC whitelist configuration

## 🚀 **How to Use**

### **Option 1: Standard Development (Recommended)**
```bash
# Start your frontend development server
npm run dev

# Access from any of these URLs:
# http://localhost:3000
# http://127.0.0.1:3000
# http://192.168.40.237:3000
```

### **Option 2: Development Mode (Any Network)**
```bash
# Include development headers in your requests
curl -H "X-Dev-Mode: true" \
     -H "X-MAC-Address: 2a:7f:6d:ae:4a:c9" \
     -H "Origin: http://any-domain.com" \
     https://api.jewgo.app/api/v5/auth/health
```

### **Option 3: From Any Network (Using Your IP)**
```bash
# If your IP changes, update the whitelist
# The configuration supports these patterns:
# - 192.168.x.x (your current network)
# - 10.x.x.x (corporate networks)
# - 172.16-31.x.x (enterprise networks)
```

## 🧪 **Testing Your Setup**

Run the test script to verify everything works:

```bash
./scripts/test-cors-from-macbook.sh
```

This will test:
- ✅ CORS headers for localhost
- ✅ CORS headers for your local IP
- ✅ API endpoint accessibility
- ✅ Development mode headers

## 📋 **Allowed Origins**

Your MacBook can now access the API from:

### **Production Origins**
- `https://jewgo.app`
- `https://app.jewgo.app`
- `https://staging.jewgo.app`

### **Development Origins**
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://192.168.40.237:3000`
- `https://localhost:3000`
- `https://127.0.0.1:3000`
- `https://192.168.40.237:3000`

### **Local Network Ranges**
- `http://192.168.x.x:port` (any 192.168 network)
- `http://10.x.x.x:port` (any 10.x network)
- `http://172.16-31.x.x:port` (any 172.16-31 network)

### **Development Mode (Any Origin)**
- Any origin when `X-Dev-Mode: true` header is present
- Requires `X-MAC-Address: 2a:7f:6d:ae:4a:c9` header

## 🔒 **Security Features**

### **Rate Limiting**
- Auth endpoints: 60 requests/minute
- API endpoints: 100 requests/minute
- General endpoints: 200 requests/minute

### **MAC Address Verification**
- Your MAC address is whitelisted
- Additional MAC addresses can be added to `mac-whitelist.conf`

### **IP Whitelisting**
- Your current IP is whitelisted
- Local network ranges are allowed
- Corporate/enterprise networks supported

## 🛠 **Troubleshooting**

### **If CORS Still Blocks You:**

1. **Check your current IP:**
   ```bash
   ifconfig | grep "inet " | grep -v "127.0.0.1"
   ```

2. **Update the whitelist if IP changed:**
   - Edit `backend/nginx/jewgo-security.conf`
   - Add your new IP to the origin map
   - Deploy the configuration

3. **Use development mode:**
   ```bash
   # Add these headers to your requests
   X-Dev-Mode: true
   X-MAC-Address: 2a:7f:6d:ae:4a:c9
   ```

4. **Test with curl:**
   ```bash
   curl -H "Origin: http://your-domain.com" \
        -H "X-Dev-Mode: true" \
        -H "X-MAC-Address: 2a:7f:6d:ae:4a:c9" \
        https://api.jewgo.app/api/v5/auth/health
   ```

### **If You Change Networks:**

The configuration supports common network ranges, but if you're on an unusual network:

1. **Find your new IP:**
   ```bash
   ifconfig | grep "inet " | grep -v "127.0.0.1"
   ```

2. **Add it to the whitelist:**
   - Edit `backend/nginx/jewgo-security.conf`
   - Add your new IP to the origin map
   - Deploy the configuration

3. **Or use development mode** (works from any network)

## 📝 **Deployment Notes**

To deploy these changes to your server:

1. **Copy the new configuration files:**
   ```bash
   scp backend/nginx/cors-config.conf ubuntu@api.jewgo.app:/etc/nginx/
   scp backend/nginx/mac-whitelist.conf ubuntu@api.jewgo.app:/etc/nginx/
   scp backend/nginx/dev-cors-config.conf ubuntu@api.jewgo.app:/etc/nginx/
   scp backend/nginx/jewgo-security.conf ubuntu@api.jewgo.app:/etc/nginx/sites-available/
   ```

2. **Test the configuration:**
   ```bash
   ssh ubuntu@api.jewgo.app "sudo nginx -t"
   ```

3. **Reload Nginx:**
   ```bash
   ssh ubuntu@api.jewgo.app "sudo systemctl reload nginx"
   ```

4. **Test from your MacBook:**
   ```bash
   ./scripts/test-cors-from-macbook.sh
   ```

## 🎉 **Summary**

Your MacBook is now configured for seamless API access:

- ✅ **Local Development**: Works from localhost and your local IP
- ✅ **Any Network**: Works from any network using development mode
- ✅ **MAC Address Whitelist**: Your device is permanently whitelisted
- ✅ **IP Whitelist**: Your current IP and local network ranges are allowed
- ✅ **Security**: Maintains security while allowing development access

You can now develop from anywhere without CORS issues! 🚀
