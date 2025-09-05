/**
 * Promote First Admin Script
 * 
 * This script promotes the first user to super admin role.
 * 
 * Example:
 * npx tsx scripts/promote-first-admin.ts admin@example.com
 */

// PostgreSQL auth - using backend API instead of Supabase
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('Admin promotion not implemented for PostgreSQL auth');
console.log('Please use the backend API to manage admin roles');
console.log('See the backend documentation for admin setup instructions');

process.exit(0);