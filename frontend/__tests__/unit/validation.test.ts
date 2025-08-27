import { validationUtils } from '@/lib/admin/validation';
import { FIELD_LIMITS } from '@/lib/admin/validation';

describe('validation utils', () => {
  test('validateUserUpdate allows partial updates', () => {
    const data = validationUtils.validateUserUpdate({});
    expect(data).toEqual({});
    const ok = validationUtils.validateUserUpdate({ email: 'a@b.com' });
    expect(ok.email).toBe('a@b.com');
  });

  test('validateUserUpdate rejects invalid email', () => {
    expect(() => validationUtils.validateUserUpdate({ email: 'bad' })).toThrow();
  });

  test('restaurantCreateSchema enforces kosher_category max', () => {
    const tooLong = 'x'.repeat(FIELD_LIMITS.restaurant.kosher_category + 1);
    const valid = {
      name: 'R',
      address: 'A',
      city: 'C',
      state: 'ST',
      zip_code: '00000',
      phone_number: '123',
      listing_type: 'eatery',
      certifying_agency: 'Agency',
      kosher_category: 'Meat',
    };
    // Valid baseline
    expect(() => validationUtils.validateRestaurant(valid)).not.toThrow();
    // Too long kosher_category
    expect(() => validationUtils.validateRestaurant({ ...valid, kosher_category: tooLong })).toThrow();
  });
});

