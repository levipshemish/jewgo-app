/**
 * API response validation for v5 API client.
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export const EntitySchemas = {
  restaurant: { type: 'object', required: ['id', 'name'] },
  synagogue: { type: 'object', required: ['id', 'name'] },
  mikvah: { type: 'object', required: ['id', 'name'] },
  store: { type: 'object', required: ['id', 'name'] }
};

export function validateApiResponse(data: any, _schema?: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push({
      field: 'response',
      message: 'Response must be an object',
      value: data
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}