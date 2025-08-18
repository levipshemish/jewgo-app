#!/usr/bin/env node

/**
 * Font Loading Test Script
 * 
 * This script tests font loading performance and checks for potential issues
 * that could cause preload warnings.
 */

const puppeteer = require('puppeteer');

async function testFontLoading() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Listen for network requests
    const fontRequests = [];
    page.on('request', request => {
      if (request.url().includes('.woff') || request.url().includes('.woff2')) {
        fontRequests.push({
          url: request.url(),
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Navigate to the application
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for fonts to load
    await page.waitForTimeout(3000);
    
    // Check if fonts are loaded
    const fontsLoaded = await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready.then(() => {
          return Array.from(document.fonts).map(font => ({
            family: font.family,
            weight: font.weight,
            style: font.style,
            loaded: font.status === 'loaded'
          }));
        });
      }
      return [];
    });
    
    // Check for preload warnings
    const preloadWarnings = consoleMessages.filter(msg => 
      msg.text.includes('preload') && 
      (msg.text.includes('not used') || msg.text.includes('warning'))
    );
    
    // Generate report
    fontRequests.forEach((req, index) => {
      .pop()}`);
    });
    
    fontsLoaded.forEach(font => {
      const status = font.loaded ? '✅' : '❌';
      `);
    });
    
    preloadWarnings.forEach((warning, index) => {
      });
    
    // Performance metrics
    const performanceMetrics = await page.metrics();
    }MB`);
    // Check for font display issues
    const fontDisplayIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      
      elements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const fontFamily = computedStyle.fontFamily;
        
        if (fontFamily.includes('Nunito') && computedStyle.fontSize === '0px') {
          issues.push({
            element: el.tagName,
            fontFamily: fontFamily,
            fontSize: computedStyle.fontSize
          });
        }
      });
      
      return issues;
    });
    
    if (fontDisplayIssues.length > 0) {
      fontDisplayIssues.forEach(issue => {
        `);
      });
    }
    
    // Summary
    if (preloadWarnings.length === 0) {
      } else {
      }
    
    if (fontsLoaded.length > 0) {
      } else {
      }
    
    if (fontDisplayIssues.length === 0) {
      } else {
      }
    
    } catch (error) {
    // // console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testFontLoading().catch(console.error);
}

module.exports = { testFontLoading };
