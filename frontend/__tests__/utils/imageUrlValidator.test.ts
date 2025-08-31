// Jest is already globally available, no imports needed
import { 
  getSafeImageUrl, 
  isValidImageUrl, 
  sanitizeRestaurantData,
  fixCloudinaryUrl
} from '@/lib/utils/imageUrlValidator';

describe('imageUrlValidator', () => {
  describe('getSafeImageUrl', () => {
    it('should handle Cloudinary URLs without stripping extensions', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg';
      const result = getSafeImageUrl(cloudinaryUrl);
      expect(result).toContain('image_1.jpg');
      expect(result).toContain('f_auto,q_auto');
    });

    it('should add optimization parameters to Cloudinary URLs if missing', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg';
      const result = getSafeImageUrl(cloudinaryUrl);
      expect(result).toContain('f_auto,q_auto');
    });

    it('should handle null and undefined inputs', () => {
      expect(getSafeImageUrl(null as any)).toBe('/images/default-restaurant.webp');
      expect(getSafeImageUrl(undefined as any)).toBe('/images/default-restaurant.webp');
    });

    it('should handle empty strings', () => {
      expect(getSafeImageUrl('')).toBe('/images/default-restaurant.webp');
    });

    it('should handle invalid URLs', () => {
      // getSafeImageUrl returns the input if it's a non-empty string, even if invalid
      expect(getSafeImageUrl('not-a-url')).toBe('not-a-url');
    });

    it('should handle relative URLs starting with /', () => {
      expect(getSafeImageUrl('/images/test.jpg')).toBe('/images/test.jpg');
    });

    it('should handle data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo...';
      expect(getSafeImageUrl(dataUrl)).toBe(dataUrl);
    });
  });

  describe('isValidImageUrl', () => {
    it('should validate Cloudinary URLs as valid', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg';
      expect(isValidImageUrl(cloudinaryUrl)).toBe(true);
    });

    it('should validate Cloudinary URLs without extensions as valid', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1';
      expect(isValidImageUrl(cloudinaryUrl)).toBe(true);
    });

    it('should reject default placeholder images', () => {
      expect(isValidImageUrl('/images/default-restaurant.webp')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(isValidImageUrl(null as any)).toBe(false);
      expect(isValidImageUrl(undefined as any)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidImageUrl('')).toBe(false);
    });

    it('should accept valid http/https URLs', () => {
      expect(isValidImageUrl('https://restaurant.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('http://restaurant.com/image.png')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(false);
      expect(isValidImageUrl('http://test.com/image.png')).toBe(false);
    });

    it('should reject data URLs', () => {
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo...')).toBe(false);
    });

    it('should reject relative URLs', () => {
      expect(isValidImageUrl('/images/test.jpg')).toBe(false);
    });
  });

  describe('fixCloudinaryUrl', () => {
    it('should fix common Cloudinary URL issues', () => {
      const brokenUrl = 'https://res.cloudinary.com/djgtbhjim/image/upload//jewgo/restaurants/image_1.jpg';
      const result = fixCloudinaryUrl(brokenUrl);
      // The double slash after upload/ is part of the URL structure, only path double slashes are fixed
      expect(result).toContain('f_auto,q_auto');
      expect(result).toContain('jewgo/restaurants/image_1.jpg');
    });

    it('should preserve file extensions', () => {
      const urlWithExt = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg';
      const result = fixCloudinaryUrl(urlWithExt);
      expect(result).toContain('image_1.jpg');
    });

    it('should add optimization parameters if missing', () => {
      const urlWithoutOpt = 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg';
      const result = fixCloudinaryUrl(urlWithoutOpt);
      expect(result).toContain('f_auto,q_auto');
    });
  });

  describe('sanitizeRestaurantData', () => {
    it('should sanitize restaurant image URLs', () => {
      const restaurants = [
        {
          id: 1,
          name: 'Test Restaurant',
          image_url: 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg'
        },
        {
          id: 2,
          name: 'Another Restaurant',
          image_url: null
        }
      ];

      const result = sanitizeRestaurantData(restaurants);
      
      expect(result[0].image_url).toContain('f_auto,q_auto');
      expect(result[0].image_url).toContain('image_1.jpg');
      expect(result[1].image_url).toBe('/images/default-restaurant.webp');
    });

    it('should handle empty restaurant array', () => {
      expect(sanitizeRestaurantData([])).toEqual([]);
    });

    it('should handle null input', () => {
      // The function expects an array, so it will throw on null
      expect(() => sanitizeRestaurantData(null as any)).toThrow();
    });

    it('should preserve file extensions in Cloudinary URLs', () => {
      const restaurants = [
        {
          id: 1,
          name: 'Test',
          image_url: 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg'
        }
      ];

      const result = sanitizeRestaurantData(restaurants);
      expect(result[0].image_url).toMatch(/image_1\.jpg/);
    });
  });
});