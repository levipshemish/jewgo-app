import { describe, it, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Admin API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Prisma Field Validation', () => {
    it('should validate User model field names', async () => {
      // Test that all User fields used in queries exist
      const userFields = [
        'id', 'email', 'name', 'createdat', 'updatedat', 'issuperadmin',
        'emailverified', 'image', 'deletedAt'
      ];

      for (const field of userFields) {
        try {
          await prisma.user.findFirst({
            select: { [field]: true }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`User field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });

    it('should validate Restaurant model field names', async () => {
      const restaurantFields = [
        'id', 'name', 'address', 'city', 'state', 'created_at', 'updated_at',
        'status', 'submission_status', 'approval_date', 'submission_date',
        'phone_number', 'kosher_category', 'certifying_agency',
        'google_rating', 'google_review_count', 'deleted_at'
      ];

      for (const field of restaurantFields) {
        try {
          await prisma.restaurant.findFirst({
            select: { [field]: true }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`Restaurant field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });

    it('should validate Review model field names', async () => {
      const reviewFields = [
        'id', 'rating', 'created_at', 'updated_at', 'status', 'helpful_count',
        'report_count', 'user_name', 'user_email', 'restaurant_id'
      ];

      for (const field of reviewFields) {
        try {
          await prisma.review.findFirst({
            select: { [field]: true }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`Review field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });

    it('should validate RestaurantImage model field names', async () => {
      const imageFields = [
        'id', 'image_order', 'created_at', 'updated_at', 'restaurant_id',
        'image_url', 'cloudinary_public_id'
      ];

      for (const field of imageFields) {
        try {
          await prisma.restaurantImage.findFirst({
            select: { [field]: true }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`RestaurantImage field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });
  });

  describe('AdminDatabaseService Field Validation', () => {
    it('should validate sort fields for User model', async () => {
      const validSortFields = [
        'id', 'email', 'name', 'createdat', 'updatedat', 'issuperadmin',
        'emailverified', 'image'
      ];

      for (const field of validSortFields) {
        try {
          await prisma.user.findMany({
            orderBy: { [field]: 'asc' }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`User sort field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });

    it('should validate sort fields for Restaurant model', async () => {
      const validSortFields = [
        'id', 'name', 'address', 'city', 'state', 'created_at', 'updated_at', 
        'status', 'submission_status', 'approval_date', 'submission_date',
        'phone_number', 'kosher_category', 'certifying_agency',
        'google_rating', 'google_review_count'
      ];

      for (const field of validSortFields) {
        try {
          await prisma.restaurant.findMany({
            orderBy: { [field]: 'asc' }
          });
        } catch (error: any) {
          if (error.code === 'P2022') {
            throw new Error(`Restaurant sort field '${field}' does not exist in schema`);
          }
          throw error;
        }
      }
    });
  });
});
