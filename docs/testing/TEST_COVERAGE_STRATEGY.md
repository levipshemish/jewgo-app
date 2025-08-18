# Test Coverage Strategy & Implementation

## Overview

The JewGo application implements a comprehensive testing strategy with both Pytest (backend) and Jest (frontend) to ensure code quality, reliability, and maintainability. This document outlines our testing approach, coverage requirements, and implementation details.

## 🎯 **Testing Philosophy**

### **Core Principles**
- **Comprehensive Coverage**: Target 80%+ code coverage across all modules
- **Test-Driven Development**: Write tests before or alongside feature development
- **Automated Testing**: All tests run automatically in CI/CD pipeline
- **Fast Feedback**: Tests should provide quick feedback on code changes
- **Maintainable Tests**: Tests should be readable, maintainable, and well-documented

### **Testing Pyramid**
```
    /\
   /  \     E2E Tests (Few)
  /____\    Integration Tests (Some)
 /______\   Unit Tests (Many)
```

## 🔧 **Backend Testing (Pytest)**

### **Configuration**

#### **Pytest Configuration** (`backend/pytest.ini`)
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --tb=short
    --strict-markers
    --disable-warnings
    --cov=.
    --cov-report=term-missing
    --cov-report=html
    --cov-report=xml
    --cov-report=json
    --cov-fail-under=80
    --cov-branch
    --cov-config=.coveragerc
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
    api: API tests
    database: Database tests
    feature_flags: Feature flag tests
    security: Security tests
    performance: Performance tests
    e2e: End-to-end tests
```

#### **Coverage Configuration** (`backend/.coveragerc`)
```ini
[run]
source = .
omit = 
    */tests/*
    */venv/*
    */__pycache__/*
    */migrations/*
    */scripts/*
    setup.py
    manage.py
    wsgi.py
    asgi.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:
    class .*\bProtocol\):
    @(abc\.)?abstractmethod
    def main\(\):
    if TYPE_CHECKING:
    from __future__ import annotations

show_missing = True
precision = 2

[html]
directory = htmlcov
title = JewGo Backend Test Coverage Report

[xml]
output = coverage.xml
```

### **Test Organization**

#### **Directory Structure**
```
backend/tests/
├── __init__.py
├── conftest.py                 # Shared fixtures and configuration
├── test_error_handler.py       # Error handling tests
├── test_hours.py              # Hours management tests
├── test_feature_flags.py      # Feature flags tests
├── unit/                      # Unit tests
│   ├── test_database_manager.py
│   ├── test_feature_flags.py
│   └── test_utils.py
├── integration/               # Integration tests
│   ├── test_api_endpoints.py
│   ├── test_database_operations.py
│   └── test_external_apis.py
├── api/                       # API-specific tests
│   ├── test_restaurants.py
│   ├── test_search.py
│   └── test_specials.py
├── security/                  # Security tests
│   ├── test_authentication.py
│   ├── test_authorization.py
│   └── test_input_validation.py
└── performance/               # Performance tests
    ├── test_database_performance.py
    └── test_api_performance.py
```

#### **Test Categories**

##### **1. Unit Tests** (`@pytest.mark.unit`)
- **Purpose**: Test individual functions and methods in isolation
- **Coverage**: 90%+ of business logic
- **Speed**: Fast (< 100ms per test)
- **Dependencies**: Mocked external dependencies

```python
@pytest.mark.unit
def test_feature_flag_creation():
    """Test creating a feature flag."""
    flag = FeatureFlag(
        name="test_flag",
        enabled=True,
        description="Test flag",
        version="1.0"
    )
    
    assert flag.name == "test_flag"
    assert flag.enabled is True
    assert flag.description == "Test flag"
```

##### **2. Integration Tests** (`@pytest.mark.integration`)
- **Purpose**: Test interactions between components
- **Coverage**: API endpoints, database operations
- **Speed**: Medium (100ms - 1s per test)
- **Dependencies**: Real database, mocked external APIs

```python
@pytest.mark.integration
def test_restaurant_search_integration(client, sample_restaurants):
    """Test restaurant search with real database."""
    # Setup test data
    for restaurant in sample_restaurants:
        client.post('/api/restaurants', json=restaurant)
    
    # Test search
    response = client.get('/api/restaurants/search?q=dairy')
    assert response.status_code == 200
    
    data = response.get_json()
    assert len(data['restaurants']) > 0
```

##### **3. API Tests** (`@pytest.mark.api`)
- **Purpose**: Test API endpoints and responses
- **Coverage**: All API endpoints, status codes, response formats
- **Speed**: Fast to medium
- **Dependencies**: Flask test client

```python
@pytest.mark.api
def test_get_restaurants_endpoint(client):
    """Test GET /api/restaurants endpoint."""
    response = client.get('/api/restaurants')
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'restaurants' in data
    assert isinstance(data['restaurants'], list)
```

##### **4. Database Tests** (`@pytest.mark.database`)
- **Purpose**: Test database operations and queries
- **Coverage**: CRUD operations, complex queries, data integrity
- **Speed**: Medium to slow
- **Dependencies**: Test database

```python
@pytest.mark.database
def test_restaurant_creation(db_manager, sample_restaurant_data):
    """Test creating a restaurant in database."""
    restaurant_id = db_manager.create_restaurant(sample_restaurant_data)
    
    assert restaurant_id is not None
    
    restaurant = db_manager.get_restaurant_by_id(restaurant_id)
    assert restaurant['name'] == sample_restaurant_data['name']
```

##### **5. Security Tests** (`@pytest.mark.security`)
- **Purpose**: Test security features and vulnerabilities
- **Coverage**: Authentication, authorization, input validation
- **Speed**: Fast to medium
- **Dependencies**: Mocked security components

```python
@pytest.mark.security
def test_admin_authentication_required(client):
    """Test that admin endpoints require authentication."""
    response = client.post('/api/feature-flags', json={})
    assert response.status_code == 401
```

##### **6. Performance Tests** (`@pytest.mark.performance`)
- **Purpose**: Test performance characteristics
- **Coverage**: Response times, memory usage, database query performance
- **Speed**: Slow (benchmark tests)
- **Dependencies**: Performance monitoring tools

```python
@pytest.mark.performance
def test_feature_flag_evaluation_performance():
    """Test that feature flag evaluation is fast."""
    import time
    
    manager = FeatureFlagManager()
    flag = FeatureFlag(name="perf_flag", enabled=True)
    manager.add_flag(flag)
    
    start_time = time.time()
    for _ in range(1000):
        manager.is_enabled("perf_flag")
    end_time = time.time()
    
    # Should complete 1000 evaluations in less than 1 second
    assert (end_time - start_time) < 1.0
```

### **Test Fixtures**

#### **Shared Fixtures** (`backend/tests/conftest.py`)
```python
@pytest.fixture(scope="session")
def app():
    """Create and configure a new app instance for each test session."""
    flask_app.config.update({
        'TESTING': True,
        'DATABASE_URL': os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:'),
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
    })
    return flask_app

@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()

@pytest.fixture
def db_manager():
    """Create a database manager for testing."""
    manager = EnhancedDatabaseManager()
    manager.connect()
    yield manager
    manager.close()

@pytest.fixture
def sample_restaurant_data():
    """Sample restaurant data for testing."""
    return {
        'name': 'Test Kosher Restaurant',
        'address': '123 Test Street',
        'city': 'Miami',
        'state': 'FL',
        'zip_code': '33101',
        'phone_number': '305-555-0123',
        'website': 'https://testrestaurant.com',
        'kosher_category': 'dairy',
        'certifying_agency': 'ORB',
        'is_cholov_yisroel': True,
        'is_pas_yisroel': False,
        'hours_of_operation': 'Mon-Fri: 9AM-5PM',
        'latitude': 25.7617,
        'longitude': -80.1918
    }
```

### **Coverage Requirements**

#### **Coverage Thresholds**
- **Overall Coverage**: 80% minimum
- **Critical Modules**: 90% minimum (database, security, feature flags)
- **API Endpoints**: 95% minimum
- **Business Logic**: 90% minimum

#### **Coverage Reports**
```bash
# Generate coverage reports
pytest --cov=. --cov-report=html --cov-report=xml --cov-report=json

# Coverage reports generated:
# - htmlcov/index.html (HTML report)
# - coverage.xml (XML report for CI)
# - coverage.json (JSON report for analysis)
```

## 🎨 **Frontend Testing (Jest)**

### **Configuration**

#### **Jest Configuration** (`frontend/jest.config.js`)
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov',
    'cobertura',
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.spec.{js,jsx,ts,tsx}',
  ],
  verbose: true,
  collectCoverage: true,
  coverageProvider: 'v8',
}

module.exports = createJestConfig(customJestConfig)
```

#### **Jest Setup** (`frontend/jest.setup.js`)
```javascript
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'https://jewgo.onrender.com'
process.env.NEXT_PUBLIC_ADMIN_TOKEN = 'test-admin-token'

// Mock fetch globally
global.fetch = jest.fn()
```

### **Test Organization**

#### **Directory Structure**
```
frontend/__tests__/
├── unit/                       # Unit tests
│   ├── hooks/
│   │   ├── useFeatureFlags.test.ts
│   │   └── useDebounce.test.ts
│   ├── components/
│   │   ├── RestaurantCard.test.tsx
│   │   └── SearchBox.test.tsx
│   └── utils/
│       ├── distance.test.ts
│       └── colors.test.ts
├── integration/                # Integration tests
│   ├── pages/
│   │   ├── eatery.test.tsx
│   │   └── restaurant.test.tsx
│   └── api/
│       └── restaurants.test.ts
├── e2e/                        # End-to-end tests
│   ├── search-flow.test.ts
│   └── restaurant-details.test.ts
└── __mocks__/                  # Mock files
    ├── api.ts
    └── components.ts
```

#### **Test Categories**

##### **1. Unit Tests**
- **Purpose**: Test individual components, hooks, and utilities
- **Coverage**: Component logic, hook behavior, utility functions
- **Speed**: Fast (< 100ms per test)
- **Dependencies**: Mocked external dependencies

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'

describe('useFeatureFlags', () => {
  it('should fetch feature flags on mount', async () => {
    const mockResponse = {
      feature_flags: {
        test_flag: {
          enabled: true,
          description: 'Test flag',
          version: '1.0',
          rollout_percentage: 100,
          target_environments: ['development']
        }
      },
      environment: 'development',
      user_id: 'test_user'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flags).toEqual(mockResponse.feature_flags)
  })
})
```

##### **2. Integration Tests**
- **Purpose**: Test component interactions and page behavior
- **Coverage**: Page components, component interactions
- **Speed**: Medium (100ms - 1s per test)
- **Dependencies**: Mocked API calls

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EateryPage from '@/app/eatery/page'

describe('EateryPage', () => {
  it('should display restaurants and handle search', async () => {
    const mockRestaurants = [
      {
        id: 1,
        name: 'Test Restaurant',
        kosher_category: 'dairy',
        address: '123 Test St'
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ restaurants: mockRestaurants })
    })

    render(<EateryPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search restaurants...')
    await userEvent.type(searchInput, 'dairy')

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
    })
  })
})
```

##### **3. End-to-End Tests**
- **Purpose**: Test complete user workflows
- **Coverage**: Full user journeys, critical paths
- **Speed**: Slow (1s - 10s per test)
- **Dependencies**: Real browser environment

```typescript
import { test, expect } from '@playwright/test'

test('complete restaurant search flow', async ({ page }) => {
  await page.goto('/eatery')
  
  // Search for restaurants
  await page.fill('[data-testid="search-input"]', 'dairy')
  await page.click('[data-testid="search-button"]')
  
  // Verify results
  await expect(page.locator('[data-testid="restaurant-card"]')).toHaveCount(1)
  
  // Click on restaurant
  await page.click('[data-testid="restaurant-card"]')
  
  // Verify restaurant details page
  await expect(page).toHaveURL(/\/restaurant\/\d+/)
  await expect(page.locator('[data-testid="restaurant-name"]')).toBeVisible()
})
```

### **Coverage Requirements**

#### **Coverage Thresholds**
- **Overall Coverage**: 80% minimum
- **Components**: 85% minimum
- **Hooks**: 90% minimum
- **Utilities**: 95% minimum
- **Pages**: 75% minimum

#### **Coverage Reports**
```bash
# Generate coverage reports
npm run test:coverage

# Coverage reports generated:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/cobertura-coverage.xml (XML report for CI)
# - coverage/coverage-final.json (JSON report for analysis)
```

## 🚀 **CI/CD Integration**

### **GitHub Actions Workflow**

#### **Backend Testing** (`.github/workflows/ci.yml`)
```yaml
- name: Run pytest with coverage
  run: |
    pip install --no-cache-dir pytest pytest-cov flake8 black isort
    pytest --cov=. --cov-report=xml --cov-report=term-missing
    coverage report --show-missing

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
    flags: backend
    name: backend-coverage
```

#### **Frontend Testing** (`.github/workflows/ci.yml`)
```yaml
- name: Run Jest tests with coverage
  run: |
    npm run test:ci
    npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/cobertura-coverage.xml
    flags: frontend
    name: frontend-coverage
```

### **Coverage Badges**
```markdown
[![Backend Coverage](https://codecov.io/gh/your-repo/jewgo-app/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/your-repo/jewgo-app)
[![Frontend Coverage](https://codecov.io/gh/your-repo/jewgo-app/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/your-repo/jewgo-app)
```

## 📊 **Coverage Monitoring**

### **Coverage Metrics**

#### **Key Metrics**
- **Line Coverage**: Percentage of code lines executed
- **Branch Coverage**: Percentage of code branches executed
- **Function Coverage**: Percentage of functions called
- **Statement Coverage**: Percentage of statements executed

#### **Coverage Goals**
```
Backend Coverage Goals:
├── Overall: 80%+
├── Critical Modules: 90%+
│   ├── Database Manager: 95%
│   ├── Feature Flags: 90%
│   ├── Security: 95%
│   └── API Endpoints: 95%
└── Utilities: 85%+

Frontend Coverage Goals:
├── Overall: 80%+
├── Components: 85%+
├── Hooks: 90%+
├── Utilities: 95%+
└── Pages: 75%+
```

### **Coverage Reports**

#### **HTML Reports**
- **Backend**: `backend/htmlcov/index.html`
- **Frontend**: `frontend/coverage/lcov-report/index.html`

#### **XML Reports** (CI Integration)
- **Backend**: `backend/coverage.xml`
- **Frontend**: `frontend/coverage/cobertura-coverage.xml`

#### **JSON Reports** (Analysis)
- **Backend**: `backend/coverage.json`
- **Frontend**: `frontend/coverage/coverage-final.json`

## 🛠️ **Testing Commands**

### **Backend Commands**
```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=. --cov-report=html

# Run specific test categories
pytest -m unit                    # Unit tests only
pytest -m integration             # Integration tests only
pytest -m api                     # API tests only
pytest -m security                # Security tests only
pytest -m performance             # Performance tests only

# Run tests with specific markers
pytest -m "not slow"              # Exclude slow tests
pytest -k "feature_flag"          # Run tests matching pattern

# Generate coverage reports
pytest --cov=. --cov-report=html --cov-report=xml --cov-report=json

# Check coverage threshold
pytest --cov=. --cov-fail-under=80
```

### **Frontend Commands**
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test categories
npm run test:unit                 # Unit tests only
npm run test:integration          # Integration tests only
npm run test:e2e                  # E2E tests only

# Update snapshots
npm run test:update

# Clear test cache
npm run test:clear

# Run tests in CI mode
npm run test:ci
```

## 📈 **Coverage Improvement**

### **Coverage Analysis**

#### **Identifying Gaps**
```bash
# Generate detailed coverage report
pytest --cov=. --cov-report=term-missing

# Output shows missing lines:
# Name                           Stmts   Miss  Cover   Missing
# -------------------------------------------------------------
# utils/feature_flags.py            45      3    93%   15-17, 89
```

#### **Coverage Trends**
- **Monitor coverage over time**
- **Set coverage goals for each release**
- **Track coverage by module/component**
- **Identify areas needing improvement**

### **Improvement Strategies**

#### **1. Identify Low-Coverage Areas**
```bash
# Find files with low coverage
pytest --cov=. --cov-report=term-missing | grep -E "^\s*[0-9]+%"

# Focus on critical modules first
pytest --cov=utils/feature_flags --cov-report=term-missing
```

#### **2. Add Missing Tests**
```python
# Example: Add test for missing branch
def test_feature_flag_edge_case():
    """Test edge case that was previously uncovered."""
    flag = FeatureFlag(name="edge_flag", enabled=False)
    
    # Test the specific condition that was missing
    result = flag.should_enable_for_user(None, "production")
    assert result is False
```

#### **3. Refactor for Testability**
```python
# Before: Hard to test
def complex_function():
    # Complex logic with external dependencies
    pass

# After: Testable
def complex_function(dependency=None):
    # Dependency injection for testing
    if dependency is None:
        dependency = get_default_dependency()
    # Testable logic
    pass
```

## 🔍 **Test Quality**

### **Test Best Practices**

#### **1. Test Structure (AAA Pattern)**
```python
def test_feature_flag_creation():
    # Arrange
    flag_name = "test_flag"
    flag_description = "Test flag"
    
    # Act
    flag = FeatureFlag(name=flag_name, description=flag_description)
    
    # Assert
    assert flag.name == flag_name
    assert flag.description == flag_description
```

#### **2. Descriptive Test Names**
```python
# Good
def test_feature_flag_should_be_disabled_when_expired():
    pass

# Bad
def test_flag():
    pass
```

#### **3. Test Isolation**
```python
# Each test should be independent
@pytest.fixture(autouse=True)
def clean_database():
    # Setup
    yield
    # Cleanup
    cleanup_test_data()
```

#### **4. Mock External Dependencies**
```python
@patch('requests.get')
def test_api_call(mock_get):
    mock_get.return_value.json.return_value = {'data': 'test'}
    # Test implementation
```

### **Test Maintenance**

#### **1. Regular Test Reviews**
- **Review test coverage monthly**
- **Update tests when features change**
- **Remove obsolete tests**
- **Refactor tests for better maintainability**

#### **2. Test Documentation**
```python
def test_feature_flag_rollout_percentage():
    """
    Test that feature flag rollout percentage works correctly.
    
    This test verifies:
    1. 100% rollout always enables the feature
    2. 0% rollout always disables the feature
    3. Partial rollout is consistent for the same user
    """
    # Test implementation
```

## 🚨 **Coverage Alerts**

### **Coverage Thresholds**
```yaml
# .github/workflows/ci.yml
- name: Check coverage thresholds
  run: |
    # Backend coverage check
    pytest --cov=. --cov-report=term-missing --cov-fail-under=80
    
    # Frontend coverage check
    npm run test:coverage
    # Coverage threshold is set in jest.config.js
```

### **Coverage Notifications**
- **Slack notifications for coverage drops**
- **Email alerts for critical coverage issues**
- **PR comments with coverage changes**
- **Coverage trend analysis**

## 📚 **Additional Resources**

### **Documentation**
- [Pytest Documentation](https://docs.pytest.org/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)

### **Tools**
- [Codecov](https://codecov.io/) - Coverage reporting and analysis
- [Coveralls](https://coveralls.io/) - Alternative coverage service
- [SonarQube](https://www.sonarqube.org/) - Code quality and coverage analysis

### **Best Practices**
- [Testing Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
- [Continuous Testing](https://www.atlassian.com/continuous-delivery/principles/continuous-testing)

---

This comprehensive testing strategy ensures that the JewGo application maintains high code quality, reliability, and maintainability through thorough testing and coverage monitoring. 