const Redis = require('ioredis');

// Load environment variables
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

console.log('Testing Redis configuration...');
console.log('Redis URL:', redisUrl ? 'Present' : 'Missing');
console.log('Redis Host:', redisHost);
console.log('Redis Port:', redisPort);
console.log('Redis Password:', redisPassword ? 'Present' : 'Missing');

let redis;

if (redisUrl) {
  redis = new Redis(redisUrl);
} else if (redisHost && redisPassword) {
  redis = new Redis({
    host: redisHost,
    port: redisPort || 6379,
    password: redisPassword,
    db: process.env.REDIS_DB || 0
  });
} else {
  console.error('❌ Redis configuration missing');
  process.exit(1);
}

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    
    // Test basic connection
    await redis.ping();
    console.log('✅ Redis connection successful');
    
    // Test basic operations
    await redis.set('test:key', 'test:value', 'EX', 60);
    const value = await redis.get('test:key');
    
    if (value === 'test:value') {
      console.log('✅ Redis read/write operations successful');
    } else {
      console.error('❌ Redis read/write operations failed');
      return false;
    }
    
    // Clean up
    await redis.del('test:key');
    
    return true;
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    return false;
  } finally {
    await redis.quit();
  }
}

testRedis().then(success => {
  if (success) {
    console.log('✅ All Redis tests passed');
  } else {
    console.log('❌ Redis tests failed');
    process.exit(1);
  }
});
