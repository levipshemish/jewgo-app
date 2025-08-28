# Code Quality Standards

## Overview

This document defines the code quality standards, best practices, and critical rules for maintaining high-quality code in the JewGo application.

## Critical Rules

### ⚠️ Syntax Error Prevention

**CRITICAL RULE**: Never use automated scripts for TypeScript/JSX syntax modifications. See [Frontend Syntax Errors Documentation](./FRONTEND_SYNTAX_ERRORS_LEARNINGS.md) for detailed examples.

#### Forbidden Practices
- ❌ Using regex-based scripts for syntax changes
- ❌ Global find-and-replace without context
- ❌ Automated parameter renaming scripts
- ❌ Bulk import statement modifications

#### Required Practices
- ✅ Manual systematic fixes
- ✅ Git safety commits before changes
- ✅ Testing after each fix
- ✅ Pattern recognition and validation

## Frontend Standards (TypeScript/React)

### Code Style

#### Naming Conventions
```typescript
// Components - PascalCase
const UserProfile = () => {};

// Hooks - useCamelCase
const useUserData = () => {};

// Functions - camelCase
const handleSubmit = () => {};

// Constants - UPPER_SNAKE_CASE
const API_ENDPOINTS = {};

// Types/Interfaces - PascalCase
interface UserData {}

// Files - kebab-case
// user-profile.tsx
// api-client.ts
```

#### Import Organization
```typescript
// 1. React and Next.js imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { z } from 'zod';
import { toast } from 'react-hot-toast';

// 3. Local imports (absolute paths)
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/user';
```

#### Component Structure
```typescript
// 1. Imports
import React from 'react';

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Component
export const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  // 4. State
  const [isLoading, setIsLoading] = useState(false);

  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 6. Handlers
  const handleClick = () => {
    onAction();
  };

  // 7. Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Action</button>
    </div>
  );
};
```

### Error Handling

#### Try-Catch Patterns
```typescript
// ✅ Good - Specific error handling
try {
  const data = await fetchData();
  return data;
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error occurred', { error });
    throw new UserFriendlyError('Connection failed');
  }
  throw error;
}

// ❌ Bad - Generic error handling
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error(error);
  return null;
}
```

#### Error Boundaries
```typescript
// ✅ Good - Error boundary with fallback
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Component error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Performance

#### Memoization
```typescript
// ✅ Good - Memoize expensive calculations
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveProcessing(item));
  }, [data]);

  return <div>{processedData}</div>;
});

// ✅ Good - Memoize callbacks
const ParentComponent = () => {
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);

  return <ChildComponent onClick={handleClick} />;
};
```

#### Lazy Loading
```typescript
// ✅ Good - Lazy load components
const LazyComponent = lazy(() => import('./LazyComponent'));

const App = () => (
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
);
```

### Testing Standards

#### Unit Tests
```typescript
// ✅ Good - Comprehensive unit test
describe('UserProfile', () => {
  it('should render user information correctly', () => {
    const user = { name: 'John', email: 'john@example.com' };
    render(<UserProfile user={user} />);
    
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<UserProfile user={null} isLoading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(<UserProfile user={null} error="Failed to load" />);
    
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
```

#### Integration Tests
```typescript
// ✅ Good - Integration test
describe('User Authentication Flow', () => {
  it('should complete login flow successfully', async () => {
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    });
  });
});
```

## Backend Standards (Python/Flask)

### Code Style

#### Naming Conventions
```python
# Functions - snake_case
def get_user_data(user_id: str) -> dict:
    pass

# Classes - PascalCase
class UserService:
    pass

# Constants - UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3

# Files - snake_case
# user_service.py
# api_client.py
```

#### Import Organization
```python
# 1. Standard library imports
import os
import json
from typing import Optional, List

# 2. Third-party imports
from flask import Flask, request, jsonify
from sqlalchemy import Column, String, Integer

# 3. Local imports
from services.user_service import UserService
from utils.error_handler import handle_error
```

#### Function Structure
```python
def process_user_data(user_id: str, data: dict) -> dict:
    """
    Process user data and return updated information.
    
    Args:
        user_id: The unique identifier for the user
        data: The user data to process
        
    Returns:
        dict: The processed user data
        
    Raises:
        ValidationError: If the data is invalid
        DatabaseError: If database operation fails
    """
    # 1. Input validation
    if not user_id or not data:
        raise ValidationError("Invalid input parameters")
    
    # 2. Business logic
    processed_data = _process_data(data)
    
    # 3. Database operations
    result = _save_to_database(user_id, processed_data)
    
    # 4. Return result
    return result
```

### Error Handling

#### Custom Exceptions
```python
# ✅ Good - Custom exception hierarchy
class APIError(Exception):
    """Base exception for API errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ValidationError(APIError):
    """Exception for validation errors."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)

class DatabaseError(APIError):
    """Exception for database errors."""
    def __init__(self, message: str):
        super().__init__(message, status_code=500)
```

#### Error Handling Decorators
```python
# ✅ Good - Error handling decorator
def handle_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Validation error in {func.__name__}: {e}")
            return jsonify({"error": e.message}), e.status_code
        except DatabaseError as e:
            logger.error(f"Database error in {func.__name__}: {e}")
            return jsonify({"error": "Internal server error"}), 500
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}")
            return jsonify({"error": "Internal server error"}), 500
    return wrapper
```

### Database Operations

#### Connection Management
```python
# ✅ Good - Context manager for database connections
class DatabaseConnection:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
    
    def __enter__(self):
        self.connection = create_connection(self.connection_string)
        return self.connection
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.connection:
            self.connection.close()

# Usage
with DatabaseConnection(DB_URL) as conn:
    result = conn.execute(query)
```

#### Query Safety
```python
# ✅ Good - Parameterized queries
def get_user_by_id(user_id: str) -> Optional[dict]:
    query = "SELECT * FROM users WHERE id = %s"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (user_id,))
        return cursor.fetchone()

# ❌ Bad - String concatenation (SQL injection risk)
def get_user_by_id(user_id: str) -> Optional[dict]:
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    # ... rest of code
```

### Testing Standards

#### Unit Tests
```python
# ✅ Good - Comprehensive unit test
class TestUserService:
    def test_get_user_by_id_success(self):
        """Test successful user retrieval."""
        user_id = "test_user_123"
        expected_user = {"id": user_id, "name": "Test User"}
        
        with patch('database.get_connection') as mock_db:
            mock_db.return_value.execute.return_value.fetchone.return_value = expected_user
            
            result = UserService.get_user_by_id(user_id)
            
            assert result == expected_user
            mock_db.return_value.execute.assert_called_once()
    
    def test_get_user_by_id_not_found(self):
        """Test user not found scenario."""
        user_id = "nonexistent_user"
        
        with patch('database.get_connection') as mock_db:
            mock_db.return_value.execute.return_value.fetchone.return_value = None
            
            result = UserService.get_user_by_id(user_id)
            
            assert result is None
    
    def test_get_user_by_id_database_error(self):
        """Test database error handling."""
        user_id = "test_user_123"
        
        with patch('database.get_connection') as mock_db:
            mock_db.return_value.execute.side_effect = DatabaseError("Connection failed")
            
            with pytest.raises(DatabaseError):
                UserService.get_user_by_id(user_id)
```

#### Integration Tests
```python
# ✅ Good - Integration test
class TestUserAPI:
    def test_create_user_success(self, client):
        """Test successful user creation."""
        user_data = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "secure_password"
        }
        
        response = client.post('/api/users', json=user_data)
        
        assert response.status_code == 201
        assert response.json["name"] == user_data["name"]
        assert response.json["email"] == user_data["email"]
        assert "id" in response.json
    
    def test_create_user_invalid_data(self, client):
        """Test user creation with invalid data."""
        user_data = {
            "name": "",  # Invalid empty name
            "email": "invalid-email",  # Invalid email format
            "password": "123"  # Too short password
        }
        
        response = client.post('/api/users', json=user_data)
        
        assert response.status_code == 400
        assert "validation" in response.json["error"].lower()
```

## Security Standards

### Frontend Security

#### Input Validation
```typescript
// ✅ Good - Client-side validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
};
```

#### XSS Prevention
```typescript
// ✅ Good - Sanitize user input
import DOMPurify from 'dompurify';

const UserComment = ({ comment }: { comment: string }) => {
  const sanitizedComment = DOMPurify.sanitize(comment);
  
  return <div dangerouslySetInnerHTML={{ __html: sanitizedComment }} />;
};
```

### Backend Security

#### Input Validation
```python
# ✅ Good - Server-side validation
from marshmallow import Schema, fields, validate

class UserSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))

def create_user(data: dict) -> dict:
    schema = UserSchema()
    validated_data = schema.load(data)
    # Process validated data
```

#### Authentication
```python
# ✅ Good - JWT token validation
from functools import wraps
from flask import request, jsonify
import jwt

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "No token provided"}), 401
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(*args, **kwargs)
    return decorated
```

## Performance Standards

### Frontend Performance

#### Bundle Optimization
```typescript
// ✅ Good - Dynamic imports for code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));

// ✅ Good - Memoization for expensive operations
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);
  
  return <div>{processedData}</div>;
});
```

#### Image Optimization
```typescript
// ✅ Good - Next.js Image component
import Image from 'next/image';

const OptimizedImage = () => (
  <Image
    src="/logo.png"
    alt="Logo"
    width={200}
    height={100}
    priority={true}
    placeholder="blur"
  />
);
```

### Backend Performance

#### Database Optimization
```python
# ✅ Good - Use indexes
CREATE INDEX idx_users_email ON users(email);

# ✅ Good - Connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30
)
```

#### Caching
```python
# ✅ Good - Redis caching
import redis
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(expiry: int = 300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            redis_client.setex(cache_key, expiry, json.dumps(result))
            
            return result
        return wrapper
    return decorator
```

## Documentation Standards

### Code Documentation

#### Function Documentation
```python
def process_user_data(user_id: str, data: dict) -> dict:
    """
    Process user data and return updated information.
    
    This function validates user input, processes the data according to
    business rules, and saves the result to the database.
    
    Args:
        user_id (str): The unique identifier for the user. Must be a valid UUID.
        data (dict): The user data to process. Must contain 'name' and 'email' keys.
        
    Returns:
        dict: The processed user data with additional computed fields.
        
    Raises:
        ValidationError: If the user_id is invalid or data is missing required fields.
        DatabaseError: If the database operation fails.
        
    Example:
        >>> data = {"name": "John Doe", "email": "john@example.com"}
        >>> result = process_user_data("123e4567-e89b-12d3-a456-426614174000", data)
        >>> print(result["processed_at"])
        '2023-01-01T12:00:00Z'
    """
    pass
```

#### API Documentation
```python
@app.route('/api/users', methods=['POST'])
@require_auth
def create_user():
    """
    Create a new user.
    
    ---
    tags:
      - Users
    summary: Create a new user account
    description: Creates a new user account with the provided information.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - name
              - email
              - password
            properties:
              name:
                type: string
                description: The user's full name
                example: "John Doe"
              email:
                type: string
                format: email
                description: The user's email address
                example: "john@example.com"
              password:
                type: string
                minLength: 8
                description: The user's password
                example: "secure_password123"
    responses:
      201:
        description: User created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                  format: uuid
                name:
                  type: string
                email:
                  type: string
                  format: email
                created_at:
                  type: string
                  format: date-time
      400:
        description: Invalid input data
      401:
        description: Authentication required
    """
    pass
```

## Quality Assurance

### Pre-commit Checklist
- [ ] Code follows naming conventions
- [ ] All functions have proper documentation
- [ ] Error handling is implemented
- [ ] Tests are written and passing
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] No syntax errors (especially `_async`, `_(param)`, `_<>` patterns)

### Code Review Checklist
- [ ] Code is readable and well-structured
- [ ] Proper error handling is in place
- [ ] Security best practices are followed
- [ ] Performance implications are considered
- [ ] Tests cover the new functionality
- [ ] Documentation is updated
- [ ] No automated script artifacts remain

## Related Documentation

- [Frontend Syntax Errors](./FRONTEND_SYNTAX_ERRORS_LEARNINGS.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- [Testing Guidelines](./TESTING_GUIDELINES.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [API Documentation](./API_DOCUMENTATION.md)
