# Coding Conventions

This document outlines the coding standards and conventions for the JewGo frontend project.

## File Naming

### Components
- Use PascalCase: `RestaurantCard.tsx`, `SearchBar.tsx`
- Use descriptive names that indicate the component's purpose
- Suffix with `.tsx` for React components

### Utilities and Hooks
- Use camelCase: `useSearchInput.ts`, `formatDate.ts`
- Prefix hooks with `use`: `useDebounce.ts`, `useLocalStorage.ts`
- Use descriptive names that indicate the function's purpose

### Pages and Routes
- Use kebab-case for URLs: `restaurant/[id]/page.tsx`
- Use descriptive names: `add-eatery/page.tsx`, `live-map/page.tsx`

## Import Organization

### Import Order
1. **Built-in modules**: `react`, `next`, `fs`, `path`
2. **External libraries**: `@/components/ui/Button`, `lucide-react`
3. **Internal modules**: `@/lib/utils/helper`, `@/hooks/useAuth`
4. **Relative imports**: `./Component`, `../utils/helper`

### Import Style
```typescript
// ✅ Good
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from './utils';

// ❌ Bad
import { Button } from '../../../components/ui/Button';
import React from 'react';
import { formatDate } from './utils';
import { useAuth } from '@/hooks/useAuth';
```

### Absolute vs Relative Imports
- **Prefer absolute imports** using `@/` alias
- **Use relative imports** only for closely related files in the same directory
- **Avoid deep relative imports** (`../../../`)

## Component Structure

### Function Components
```typescript
import React from 'react';
import { Button } from '@/components/ui/Button';

interface RestaurantCardProps {
  name: string;
  rating: number;
  onSelect: (id: string) => void;
}

export default function RestaurantCard({ 
  name, 
  rating, 
  onSelect 
}: RestaurantCardProps) {
  const handleClick = () => {
    onSelect(name);
  };

  return (
    <div className="restaurant-card">
      <h3>{name}</h3>
      <div className="rating">{rating}/5</div>
      <Button onClick={handleClick}>Select</Button>
    </div>
  );
}
```

### Component Guidelines
- Use TypeScript interfaces for props
- Export components as default exports
- Use descriptive prop names
- Keep components focused and single-purpose
- Use meaningful variable names

## Error Handling

### Try-Catch Blocks
```typescript
// ✅ Good
try {
  const data = await fetchRestaurantData(id);
  return data;
} catch (error) {
  console.error('Failed to fetch restaurant data:', error);
  throw new Error('Unable to load restaurant information');
}

// ❌ Bad
try {
  const data = await fetchRestaurantData(id);
  return data;
} catch (error) {
  console.log(error);
  return null;
}
```

### Error Boundaries
- Use error boundaries for component-level error handling
- Provide meaningful error messages
- Log errors with context

## State Management

### React Hooks
```typescript
// ✅ Good
const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// ❌ Bad
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [err, setErr] = useState(null);
```

### Custom Hooks
```typescript
// ✅ Good
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await api.getRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { restaurants, loading, error, fetchRestaurants };
}
```

## API Calls

### API Route Structure
```typescript
// app/api/restaurants/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const restaurants = await getRestaurants();
    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurant = await createRestaurant(body);
    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    console.error('Failed to create restaurant:', error);
    return NextResponse.json(
      { error: 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
```

## Testing

### Test File Structure
```typescript
// __tests__/components/RestaurantCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import RestaurantCard from '@/components/RestaurantCard';

describe('RestaurantCard', () => {
  const mockProps = {
    name: 'Test Restaurant',
    rating: 4.5,
    onSelect: jest.fn(),
  };

  it('renders restaurant name and rating', () => {
    render(<RestaurantCard {...mockProps} />);
    
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('4.5/5')).toBeInTheDocument();
  });

  it('calls onSelect when button is clicked', () => {
    render(<RestaurantCard {...mockProps} />);
    
    fireEvent.click(screen.getByText('Select'));
    expect(mockProps.onSelect).toHaveBeenCalledWith('Test Restaurant');
  });
});
```

## Performance

### Optimization Guidelines
- Use `React.memo()` for expensive components
- Implement proper dependency arrays in `useEffect`
- Use `useCallback` and `useMemo` when appropriate
- Lazy load components and routes
- Optimize images and assets

### Code Splitting
```typescript
// ✅ Good - Lazy loading
const RestaurantMap = dynamic(() => import('@/components/RestaurantMap'), {
  loading: () => <div>Loading map...</div>,
  ssr: false,
});

// ❌ Bad - Eager loading everything
import RestaurantMap from '@/components/RestaurantMap';
```

## Accessibility

### ARIA Guidelines
- Use semantic HTML elements
- Provide alt text for images
- Use proper heading hierarchy
- Ensure keyboard navigation works
- Test with screen readers

```typescript
// ✅ Good
<button 
  aria-label="Add restaurant to favorites"
  onClick={handleFavorite}
>
  <HeartIcon />
</button>

// ❌ Bad
<div onClick={handleFavorite}>
  <HeartIcon />
</div>
```

## Logging

### Console Usage
```typescript
// ✅ Good - Development only
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ✅ Good - Error logging
console.error('Failed to fetch data:', error);

// ❌ Bad - Production logging
console.log('User clicked button');
```

## Comments and Documentation

### Code Comments
```typescript
// ✅ Good - Explain why, not what
// Skip validation for admin users to allow bulk operations
if (user.role === 'admin') {
  return true;
}

// ❌ Bad - Obvious comments
// Set loading to true
setLoading(true);
```

### JSDoc Comments
```typescript
/**
 * Fetches restaurant data from the API
 * @param id - The restaurant ID
 * @param options - Optional fetch options
 * @returns Promise resolving to restaurant data
 * @throws {Error} When API request fails
 */
async function fetchRestaurant(id: string, options?: RequestInit): Promise<Restaurant> {
  // Implementation
}
```

## Git Conventions

### Commit Messages
- Use conventional commit format
- Be descriptive and concise
- Reference issues when applicable

```bash
# ✅ Good
feat: add restaurant search functionality
fix: resolve authentication token expiration
docs: update API documentation
refactor: simplify restaurant card component

# ❌ Bad
fixed stuff
updated code
wip
```

### Branch Naming
- Use descriptive branch names
- Include issue numbers when applicable
- Use kebab-case

```bash
# ✅ Good
feature/restaurant-search
fix/auth-token-expiration
docs/api-documentation

# ❌ Bad
feature
fix
update
```

## Playbook

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/feature-name`
2. Add components in `components/[feature]/`
3. Add utilities in `lib/[feature]/`
4. Add pages in `app/[feature]/`
5. Add tests in `__tests__/[feature]/`
6. Update documentation
7. Create pull request

### Adding a New API Route
1. Create route file: `app/api/[route]/route.ts`
2. Implement GET/POST/PUT/DELETE handlers
3. Add input validation
4. Add error handling
5. Add tests
6. Update API documentation

### Debugging Common Issues
1. **Build errors**: Check TypeScript types and imports
2. **Runtime errors**: Check console for error messages
3. **API errors**: Check network tab and server logs
4. **Performance issues**: Use React DevTools and Lighthouse

