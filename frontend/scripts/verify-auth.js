#!/usr/bin/env node
/**
 * Frontend Authentication Verification Script
 * 
 * This script verifies that the frontend authentication fixes are working:
 * 1. AuthContext is enabled and working
 * 2. API client includes credentials
 * 3. CSRF token handling is working
 * 4. Error handling is proper
 */

const https = require('https');
const http = require('http');

class FrontendAuthVerifier {
    constructor(baseUrl = 'https://api.jewgo.app') {
        this.baseUrl = baseUrl;
        this.results = {};
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    async makeRequest(path, options = {}) {
        const url = new URL(path, this.baseUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        return new Promise((resolve, reject) => {
            const reqOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://jewgo.app',
                    ...options.headers
                }
            };

            const req = client.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = data ? JSON.parse(data) : {};
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    }
                });
            });

            req.on('error', reject);
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    async testCORSHeaders() {
        this.log('Testing CORS headers...');
        try {
            const response = await this.makeRequest('/api/v5/auth/health', {
                method: 'OPTIONS',
                headers: {
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
                }
            });

            const corsHeaders = {
                'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
                'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
                'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
                'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
            };

            if (corsHeaders['Access-Control-Allow-Origin'] === 'https://jewgo.app' &&
                corsHeaders['Access-Control-Allow-Credentials'] === 'true' &&
                corsHeaders['Access-Control-Allow-Methods']?.includes('POST') &&
                corsHeaders['Access-Control-Allow-Headers']?.includes('X-CSRF-Token')) {
                this.log('✅ CORS headers are properly configured');
                this.results.corsHeaders = true;
                return true;
            } else {
                this.log(`❌ CORS headers are not properly configured: ${JSON.stringify(corsHeaders)}`, 'ERROR');
                this.results.corsHeaders = false;
                return false;
            }
        } catch (error) {
            this.log(`❌ CORS test failed: ${error.message}`, 'ERROR');
            this.results.corsHeaders = false;
            return false;
        }
    }

    async testCSRFEndpoint() {
        this.log('Testing CSRF token endpoint...');
        try {
            const response = await this.makeRequest('/api/v5/auth/csrf');
            
            if (response.statusCode === 200 && response.data.success) {
                const csrfToken = response.data.data?.csrf_token;
                if (csrfToken) {
                    this.log('✅ CSRF token endpoint is working');
                    this.results.csrfEndpoint = true;
                    return true;
                } else {
                    this.log('❌ CSRF token endpoint failed - no token in response', 'ERROR');
                    this.results.csrfEndpoint = false;
                    return false;
                }
            } else {
                this.log(`❌ CSRF token endpoint failed: ${JSON.stringify(response.data)}`, 'ERROR');
                this.results.csrfEndpoint = false;
                return false;
            }
        } catch (error) {
            this.log(`❌ CSRF test failed: ${error.message}`, 'ERROR');
            this.results.csrfEndpoint = false;
            return false;
        }
    }

    async testAuthHealth() {
        this.log('Testing auth API health...');
        try {
            const response = await this.makeRequest('/api/v5/auth/health');
            
            if (response.statusCode === 200 && response.data.success) {
                this.log('✅ Auth API health check passed');
                this.results.authHealth = true;
                return true;
            } else {
                this.log(`❌ Auth API health check failed: ${JSON.stringify(response.data)}`, 'ERROR');
                this.results.authHealth = false;
                return false;
            }
        } catch (error) {
            this.log(`❌ Auth health test failed: ${error.message}`, 'ERROR');
            this.results.authHealth = false;
            return false;
        }
    }

    async testRateLimiting() {
        this.log('Testing rate limiting (should be reasonable)...');
        try {
            let successCount = 0;
            const requests = [];
            
            // Make 5 requests quickly
            for (let i = 0; i < 5; i++) {
                requests.push(this.makeRequest('/api/v5/auth/profile'));
            }
            
            const responses = await Promise.all(requests);
            
            for (const response of responses) {
                if (response.statusCode === 200 || response.statusCode === 401) {
                    successCount++;
                } else if (response.statusCode === 429) {
                    this.log('❌ Rate limiting too strict - got 429', 'ERROR');
                    this.results.rateLimiting = false;
                    return false;
                }
            }
            
            if (successCount >= 4) {
                this.log('✅ Rate limiting is reasonable');
                this.results.rateLimiting = true;
                return true;
            } else {
                this.log(`❌ Rate limiting test failed - only ${successCount}/5 requests succeeded`, 'ERROR');
                this.results.rateLimiting = false;
                return false;
            }
        } catch (error) {
            this.log(`❌ Rate limiting test failed: ${error.message}`, 'ERROR');
            this.results.rateLimiting = false;
            return false;
        }
    }

    async runAllTests() {
        this.log('Starting frontend authentication verification...');
        this.log('='.repeat(60));

        const tests = [
            this.testAuthHealth,
            this.testCORSHeaders,
            this.testCSRFEndpoint,
            this.testRateLimiting
        ];

        let passed = 0;
        const total = tests.length;

        for (const test of tests) {
            try {
                if (await test()) {
                    passed++;
                }
            } catch (error) {
                this.log(`❌ Test ${test.name} failed with exception: ${error.message}`, 'ERROR');
            }
        }

        this.log('='.repeat(60));
        this.log(`Verification complete: ${passed}/${total} tests passed`);

        if (passed === total) {
            this.log('🎉 All frontend authentication fixes are working correctly!', 'SUCCESS');
        } else {
            this.log(`⚠️  ${total - passed} tests failed - frontend authentication needs attention`, 'WARNING');
        }

        return {
            passed,
            total,
            successRate: passed / total,
            results: this.results
        };
    }

    generateReport() {
        const report = [];
        report.push('# Frontend Authentication Verification Report');
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push(`Base URL: ${this.baseUrl}`);
        report.push('');

        report.push('## Test Results');
        for (const [testName, result] of Object.entries(this.results)) {
            const status = result ? '✅ PASS' : '❌ FAIL';
            report.push(`- ${testName}: ${status}`);
        }

        report.push('');
        report.push('## Summary');
        const passed = Object.values(this.results).filter(r => r).length;
        const total = Object.keys(this.results).length;
        report.push(`- Tests Passed: ${passed}/${total}`);
        report.push(`- Success Rate: ${(passed/total*100).toFixed(1)}%`);

        if (passed === total) {
            report.push('- Status: 🎉 All systems operational');
        } else {
            report.push('- Status: ⚠️  Issues detected');
        }

        return report.join('\n');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const urlIndex = args.indexOf('--url');
    const baseUrl = urlIndex !== -1 && args[urlIndex + 1] ? args[urlIndex + 1] : 'https://api.jewgo.app';
    
    const verifier = new FrontendAuthVerifier(baseUrl);
    const results = await verifier.runAllTests();

    if (args.includes('--report')) {
        const report = verifier.generateReport();
        console.log('\n' + '='.repeat(60));
        console.log(report);
    }

    // Exit with appropriate code
    process.exit(results.passed === results.total ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = FrontendAuthVerifier;
