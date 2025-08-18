#!/usr/bin/env node
/**
 * Keep Alive Script for JewGo Backend
 * 
 * This script pings the backend service periodically to prevent it from sleeping
 * on Render's free tier. It can be run as a cron job or continuous process.
 */

const https = require('https');
const http = require('http');

class KeepAliveMonitor {
  constructor() {
    this.apiUrl = process.env.API_URL || 'https://jewgo.onrender.com';
    this.interval = parseInt(process.env.KEEP_ALIVE_INTERVAL) || 10 * 60 * 1000; // 10 minutes default
    this.timeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 30000; // 30 seconds
    this.endpoints = [
      '/health',
      '/api/restaurants?limit=1'
    ];
  }

  async pingEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `${this.apiUrl}${endpoint}`;
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;
      
      const req = client.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'JewGo-KeepAlive/1.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              endpoint,
              status: res.statusCode,
              success: true,
              timestamp: new Date().toISOString()
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async performHealthCheck() {
    console.log(`[${new Date().toISOString()}] Performing health check...`);
    
    const results = [];
    
    for (const endpoint of this.endpoints) {
      try {
        const result = await this.pingEndpoint(endpoint);
        results.push(result);
        console.log(`✅ ${endpoint}: ${result.status}`);
      } catch (error) {
        const errorResult = {
          endpoint,
          status: 'error',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.push(errorResult);
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    // Log summary
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Health check complete: ${successCount}/${totalCount} endpoints successful`);
    
    return results;
  }

  start() {
    console.log(`Starting keep-alive monitor for ${this.apiUrl}`);
    console.log(`Interval: ${this.interval / 1000} seconds`);
    console.log(`Timeout: ${this.timeout / 1000} seconds`);
    
    // Perform initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.interval);
  }

  async runOnce() {
    console.log('Running single health check...');
    const results = await this.performHealthCheck();
    process.exit(results.every(r => r.success) ? 0 : 1);
  }
}

// Main execution
const monitor = new KeepAliveMonitor();

if (process.argv.includes('--once')) {
  monitor.runOnce();
} else {
  monitor.start();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down keep-alive monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down keep-alive monitor...');
  process.exit(0);
});
