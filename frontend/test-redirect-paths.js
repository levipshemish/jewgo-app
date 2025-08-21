// Simple test to verify validateRedirectUrl includes new paths
const { validateRedirectUrl } = require('./lib/utils/auth-utils.ts');

console.log('Testing new paths:');
console.log('/add-eatery:', validateRedirectUrl('/add-eatery'));
console.log('/restaurant/123:', validateRedirectUrl('/restaurant/123'));
console.log('/eatery/456:', validateRedirectUrl('/eatery/456'));
console.log('/shuls/789:', validateRedirectUrl('/shuls/789'));
console.log('/invalid-path:', validateRedirectUrl('/invalid-path'));
