import { PrismaClient } from '@prisma/client';
import { AdminDatabaseService } from '@/lib/admin/database';

const prisma = new PrismaClient();

describe('Prisma Schema Validation', () => {
  describe('AdminDatabaseService field validation', () => {
    it('should have valid sort fields for restaurant model', () => {
      const validFields = AdminDatabaseService.getValidSortFields('restaurant');
      const restaurantFields = Object.keys(prisma.restaurant.fields);
      
      validFields.forEach(field => {
        expect(restaurantFields).toContain(field);
      });
    });

    it('should have valid sort fields for review model', () => {
      const validFields = AdminDatabaseService.getValidSortFields('review');
      const reviewFields = Object.keys(prisma.review.fields);
      
      validFields.forEach(field => {
        expect(reviewFields).toContain(field);
      });
    });

    it('should have valid sort fields for user model', () => {
      const validFields = AdminDatabaseService.getValidSortFields('user');
      const userFields = Object.keys(prisma.user.fields);
      
      validFields.forEach(field => {
        expect(userFields).toContain(field);
      });
    });

    it('should have valid sort fields for restaurantImage model', () => {
      const validFields = AdminDatabaseService.getValidSortFields('restaurantImage');
      const imageFields = Object.keys(prisma.restaurantImage.fields);
      
      validFields.forEach(field => {
        expect(imageFields).toContain(field);
      });
    });

    it('should have valid sort fields for marketplace model', () => {
      const validFields = AdminDatabaseService.getValidSortFields('marketplace');
      const marketplaceFields = Object.keys(prisma.marketplace.fields);
      
      validFields.forEach(field => {
        expect(marketplaceFields).toContain(field);
      });
    });

    it('should have valid search fields for all models', () => {
      const models = ['restaurant', 'review', 'user', 'restaurantImage', 'marketplace'] as const;
      
      models.forEach(model => {
        const searchFields = AdminDatabaseService.getSearchFields(model);
        const modelFields = Object.keys((prisma as any)[model].fields);
        
        searchFields.forEach(field => {
          expect(modelFields).toContain(field);
        });
      });
    });

    it('should have valid soft delete field names', () => {
      const models = ['restaurant', 'review', 'user', 'restaurantImage', 'marketplace'] as const;
      
      models.forEach(model => {
        const softDeleteField = AdminDatabaseService.getSoftDeleteField(model);
        if (softDeleteField) {
          const modelFields = Object.keys((prisma as any)[model].fields);
          expect(modelFields).toContain(softDeleteField);
        }
      });
    });
  });

  describe('Prisma DMMF validation', () => {
    it('should have consistent field names across models', () => {
      // Test specific field names that are commonly used
      const expectedFields = {
        restaurant: ['id', 'name', 'created_at', 'updated_at'],
        review: ['id', 'rating', 'created_at', 'updated_at'],
        user: ['id', 'email', 'createdat', 'updatedat'], // Note: lowercase in schema
        restaurantImage: ['id', 'image_url', 'created_at', 'updated_at'],
        marketplace: ['id', 'name', 'created_at', 'updated_at'],
      };

      Object.entries(expectedFields).forEach(([model, fields]) => {
        const modelFields = Object.keys((prisma as any)[model].fields);
        fields.forEach(field => {
          expect(modelFields).toContain(field);
        });
      });
    });
  });
});
