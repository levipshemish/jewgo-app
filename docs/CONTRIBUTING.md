# Contributing to JewGo

## Overview

Thank you for your interest in contributing to JewGo! This guide will help you get started with contributing to the project.

## 🚨 Global Development Rule

**ALWAYS test, commit, and push changes after making any modifications to the system.**

### Required Workflow for All Changes:

#### Option 1: Automated Script (Recommended)
Use our automated script that handles the entire workflow:

```bash
# From the project root directory
./scripts/test-and-commit.sh "your commit message here"

# Or run interactively (will prompt for commit message)
./scripts/test-and-commit.sh
```

#### Option 2: Manual Workflow
If you prefer to run tests manually:

1. **Test your changes thoroughly:**
   ```bash
   # Backend tests
   cd backend && pytest
   
   # Frontend tests  
   cd frontend && npm test
   
   # Type checking
   cd frontend && npm run type-check
   
   # Linting
   cd backend && flake8 . && mypy .
   cd frontend && npm run lint
   ```

2. **Commit your changes with a descriptive message:**
   ```bash
   git add .
   git commit -m "feat: add new restaurant search functionality"
   ```

3. **Push to the repository:**
   ```bash
   git push origin main
   ```

### Why This Rule Exists:
- Ensures code quality and prevents broken code from accumulating
- Maintains a clean, testable codebase
- Enables continuous integration and deployment
- Provides immediate feedback on changes
- Prevents merge conflicts and integration issues

### Exceptions:
- Only for emergency hotfixes (must be followed up with proper testing immediately)
- Experimental branches (must be clearly marked and not merged to main)

**This rule applies to ALL contributors, including maintainers and administrators.**

## Table of Contents

- [Global Development Rule](#-global-development-rule)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Model Context Protocol (MCP) Standards](#model-context-protocol-mcp-standards)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Bug Reports](#bug-reports)
- [Code Review](#code-review)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Python 3.11.8+
- Node.js 22.x
- PostgreSQL (Neon recommended)
- Git
- GitHub account

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/jewgo-app.git
   cd jewgo-app
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/original-owner/jewgo-app.git
   ```

## Development Setup

### Quick Setup

Run the automated setup script:

```bash
./scripts/setup-dev-environment.sh
```

### Manual Setup

#### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python3 -m venv venv_py311
   source venv_py311/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install -e .[dev]
   ```

3. **Install pre-commit hooks:**
   ```bash
   pre-commit install
   ```

4. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

#### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Install development dependencies:**
   ```bash
   npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier prettier
   ```

### Database Setup

1. **Create database:**
   ```bash
   createdb jewgo_db
   ```

2. **Run migrations:**
   ```bash
   cd backend
   source venv_py311/bin/activate
   python -m alembic upgrade head
   ```

### Start Development Servers

```bash
# Start both backend and frontend
./start-dev.sh
```

## Model Context Protocol (MCP) Standards

### Overview

We use Model Context Protocol (MCP) servers to enhance our development workflow with AI-powered tools for code quality, schema validation, and deployment readiness.

### MCP Server Setup

#### Prerequisites

1. **Install MCP servers:**
   ```bash
   # Install and build all MCP servers
   pnpm mcp:setup
   ```

2. **Verify installation:**
   ```bash
   # Check that all servers are working
   pnpm mcp:strict  # TypeScript/ESLint checker
   pnpm mcp:schema  # Schema drift detection
   pnpm mcp:guard   # CI guard and health checks
   ```

#### Cursor Configuration

Add MCP servers to your Cursor configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "ts-next-strict": {
      "command": "node",
      "args": ["./tools/ts-next-strict-mcp/dist/index.js"],
      "cwd": "/path/to/your/project"
    },
    "schema-drift": {
      "command": "schema-drift-mcp"
    },
    "ci-guard": {
      "command": "node",
      "args": ["./tools/ci-guard-mcp/dist/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### MCP Usage Guidelines

#### 1. TypeScript/Next.js Strict Checking

**When to use:**
- Before committing TypeScript/JavaScript changes
- When debugging build issues
- During code reviews

**Available tools:**
- `tsc_check`: Run TypeScript type checking
- `eslint_check`: Run ESLint with fix options

**Usage examples:**
```typescript
// In Cursor, call these tools:
tsc_check { cwd: "frontend" }
eslint_check { cwd: "frontend", pattern: "app/**/*.tsx", fix: true }
```

#### 2. Schema Drift Detection

**When to use:**
- Before database migrations
- After schema changes
- During deployment preparation

**Available tools:**
- `schema_diff`: Compare SQLAlchemy models with live database

**Usage examples:**
```python
# In Cursor, call this tool:
schema_diff {
  "db_url": "postgresql+psycopg://user:pass@host:5432/db",
  "metadata_module": "backend.database.models"
}
```

#### 3. CI Guard and Health Checks

**When to use:**
- Before merging pull requests
- Before production deployments
- During performance optimization

**Available tools:**
- `premerge_guard`: Run Next.js build with performance budgets and health checks

**Usage examples:**
```typescript
// In Cursor, call this tool:
premerge_guard {
  "cwd": "frontend",
  "feHealthUrl": "https://jewgo-app.vercel.app/health",
  "beHealthUrl": "https://jewgo-app-oyoh.onrender.com/health",
  "budgets": {
    "mainKB": 500,
    "initialTotalMB": 2
  }
}
```

### MCP Integration Rules

#### Pre-Commit MCP Checks

**Required for all commits:**
1. Run TypeScript strict checking
2. Run ESLint with auto-fix
3. Verify no critical errors

```bash
# Automated MCP pre-commit check
./scripts/mcp-pre-commit.sh
```

#### Pre-Merge MCP Validation

**Required for all pull requests:**
1. Run CI guard with performance budgets
2. Check schema drift (if database changes)
3. Verify health endpoints

```bash
# Automated MCP pre-merge check
./scripts/mcp-pre-merge.sh
```

### MCP Server Maintenance

#### Updating MCP Servers

```bash
# Update all MCP servers
pnpm mcp:update

# Update individual servers
pnpm -C tools/ts-next-strict-mcp update
pnpm -C tools/ci-guard-mcp update
pipx upgrade schema-drift-mcp
```

#### Troubleshooting MCP Issues

**Common issues and solutions:**

1. **Server not starting:**
   ```bash
   # Rebuild servers
   # MCP tools are for local development only
# pnpm mcp:build
   
   # Check server status
   pnpm mcp:status
   ```

2. **Permission errors:**
   ```bash
   # Fix Python server permissions
   pipx reinstall schema-drift-mcp
   
   # Fix Node.js server permissions
   chmod +x tools/*/dist/index.js
   ```

3. **Configuration issues:**
   ```bash
   # Validate MCP configuration
   ./scripts/validate-mcp-config.sh
   ```

### MCP Best Practices

#### Code Quality Standards

1. **Always run MCP checks before committing**
2. **Fix all critical errors before pushing**
3. **Use MCP tools during code reviews**
4. **Monitor performance budgets in CI guard**

#### Performance Standards

1. **Main bundle size: < 500KB**
2. **Initial load: < 2MB**
3. **Health check response: < 2s**
4. **Build time: < 30s**

#### Schema Standards

1. **No schema drift in production**
2. **All migrations tested in staging**
3. **Backup database before schema changes**
4. **Document all schema modifications**

### MCP Error Handling

#### Error Severity Levels

- **Critical**: Block deployment (TypeScript errors, build failures)
- **Warning**: Should be addressed (ESLint warnings, performance regressions)
- **Info**: Informational (unused variables, style issues)

#### Error Resolution Workflow

1. **Identify error source using MCP tools**
2. **Fix critical errors immediately**
3. **Address warnings before next release**
4. **Document resolution for future reference**

### MCP Monitoring

#### Health Checks

```bash
# Monitor MCP server health
./scripts/mcp-health-check.sh

# Check MCP tool availability
./scripts/mcp-tool-test.sh
```

#### Performance Monitoring

```bash
# Monitor build performance
./scripts/mcp-performance-monitor.sh

# Track schema drift over time
./scripts/mcp-schema-monitor.sh
```

## Code Style

### Python (Backend)

We use several tools to maintain code quality:

#### Black (Code Formatting)
```bash
cd backend
black .
```

#### Flake8 (Linting)
```bash
cd backend
flake8 .
```

#### isort (Import Sorting)
```bash
cd backend
isort .
```

#### MyPy (Type Checking)
```bash
cd backend
mypy .
```

### JavaScript/TypeScript (Frontend)

#### ESLint (Linting)
```bash
cd frontend
npm run lint
```

#### Prettier (Code Formatting)
```bash
cd frontend
npx prettier --write .
```

#### TypeScript (Type Checking)
```bash
cd frontend
npm run type-check
```

### Pre-commit Hooks

We use pre-commit hooks to automatically format and lint code:

```bash
# Install pre-commit hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

### Code Style Guidelines

#### Python

- Follow PEP 8 style guide
- Use type hints for all functions
- Write docstrings for all public functions
- Use meaningful variable names
- Keep functions small and focused

```python
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class Restaurant:
    """Restaurant data model."""
    
    id: int
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    phone_number: str
    kosher_category: str
    certifying_agency: str
    status: str = "unknown"
    rating: Optional[float] = None
    website: Optional[str] = None

def get_restaurants_by_city(city: str) -> List[Restaurant]:
    """
    Get all restaurants in a specific city.
    
    Args:
        city: The city name to filter by
        
    Returns:
        List of restaurants in the specified city
        
    Raises:
        ValueError: If city is empty or invalid
    """
    if not city or not city.strip():
        raise ValueError("City cannot be empty")
    
    # Implementation here
    pass
```

#### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint rules
- Use meaningful variable names
- Write JSDoc comments for complex functions
- Use proper error handling

```typescript
interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  kosherCategory: KosherCategory;
  certifyingAgency: string;
  status: RestaurantStatus;
  rating?: number;
  website?: string;
}

/**
 * Fetches restaurants by city from the API
 * @param city - The city name to filter by
 * @returns Promise resolving to array of restaurants
 * @throws {Error} If the API request fails
 */
async function getRestaurantsByCity(city: string): Promise<Restaurant[]> {
  if (!city?.trim()) {
    throw new Error('City cannot be empty');
  }
  
  try {
    const response = await fetch(`/api/restaurants?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    throw error;
  }
}
```

## Testing

### Backend Testing

#### Running Tests
```bash
cd backend
source venv_py311/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_restaurants.py

# Run specific test function
pytest tests/test_restaurants.py::test_get_restaurants

# Run with verbose output
pytest -v

# Run only unit tests
pytest -m "not integration"

# Run only integration tests
pytest -m integration
```

#### Writing Tests

```python
import pytest
from unittest.mock import patch, MagicMock
from backend.database.database_manager_v3 import EnhancedDatabaseManager
from backend.types.restaurant import Restaurant, KosherCategory

class TestRestaurantAPI:
    """Test restaurant API endpoints."""
    
    @pytest.fixture
    def sample_restaurant(self):
        """Create a sample restaurant for testing."""
        return Restaurant(
            id=1,
            name="Test Restaurant",
            address="123 Test St",
            city="Test City",
            state="FL",
            zip_code="12345",
            phone_number="555-0123",
            kosher_category=KosherCategory.MEAT,
            certifying_agency="ORB"
        )
    
    def test_get_restaurants_success(self, client, sample_restaurant):
        """Test successful restaurant retrieval."""
        with patch.object(EnhancedDatabaseManager, 'get_restaurants') as mock_get:
            mock_get.return_value = [sample_restaurant]
            
            response = client.get('/api/restaurants')
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'restaurants' in data
            assert len(data['restaurants']) == 1
            assert data['restaurants'][0]['name'] == "Test Restaurant"
    
    def test_get_restaurants_empty(self, client):
        """Test restaurant retrieval when no restaurants exist."""
        with patch.object(EnhancedDatabaseManager, 'get_restaurants') as mock_get:
            mock_get.return_value = []
            
            response = client.get('/api/restaurants')
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['restaurants'] == []
    
    def test_get_restaurant_not_found(self, client):
        """Test restaurant retrieval for non-existent restaurant."""
        with patch.object(EnhancedDatabaseManager, 'get_restaurant_by_id') as mock_get:
            mock_get.return_value = None
            
            response = client.get('/api/restaurants/999')
            
            assert response.status_code == 404
            data = response.get_json()
            assert 'error' in data
```

### Frontend Testing

#### Running Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- RestaurantCard.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="restaurant"
```

#### Writing Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RestaurantCard } from '../components/restaurant/RestaurantCard';
import { Restaurant } from '../lib/types/restaurant';

const mockRestaurant: Restaurant = {
  id: 1,
  name: 'Test Restaurant',
  address: '123 Test St',
  city: 'Test City',
  state: 'FL',
  zipCode: '12345',
  phoneNumber: '555-0123',
  kosherCategory: 'meat',
  certifyingAgency: 'ORB',
  status: 'open',
  rating: 4.5,
};

describe('RestaurantCard', () => {
  it('renders restaurant information correctly', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Test City, FL 12345')).toBeInTheDocument();
    expect(screen.getByText('555-0123')).toBeInTheDocument();
  });
  
  it('displays rating when available', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });
  
  it('handles missing rating gracefully', () => {
    const restaurantWithoutRating = { ...mockRestaurant, rating: undefined };
    render(<RestaurantCard restaurant={restaurantWithoutRating} />);
    
    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  });
  
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledWith(mockRestaurant);
  });
});
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass:**
   ```bash
   # Backend tests
   cd backend && pytest
   
   # Frontend tests
   cd frontend && npm test
   ```

2. **Run linting:**
   ```bash
   # Backend
   cd backend && flake8 . && mypy .
   
   # Frontend
   cd frontend && npm run lint && npm run type-check
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### Creating a Pull Request

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new restaurant search functionality"
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Checklist
- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] No linting errors

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

## Issue Reporting

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the troubleshooting guide**
3. **Try to reproduce the issue** in a clean environment

### Issue Template

```markdown
## Bug Report

### Description
Clear and concise description of the bug.

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior
What you expected to happen.

### Actual Behavior
What actually happened.

### Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Safari, Firefox]
- Version: [e.g. 22]
- Backend Version: [e.g. 1.0.3]
- Frontend Version: [e.g. 0.1.0]

### Additional Context
Add any other context about the problem here.

### Screenshots
If applicable, add screenshots to help explain your problem.
```

## Feature Requests

### Feature Request Template

```markdown
## Feature Request

### Problem Statement
A clear and concise description of what problem this feature would solve.

### Proposed Solution
A clear and concise description of what you want to happen.

### Alternative Solutions
A clear and concise description of any alternative solutions you've considered.

### Additional Context
Add any other context or screenshots about the feature request here.

### Implementation Ideas
If you have ideas about how to implement this feature, share them here.
```

## Code Review

### Review Guidelines

1. **Be constructive and respectful**
2. **Focus on the code, not the person**
3. **Provide specific feedback**
4. **Suggest improvements**
5. **Ask questions when unclear**

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling is appropriate
- [ ] Code is readable and maintainable

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

### Release Steps

1. **Update version numbers:**
   - Backend: `backend/__init__.py`
   - Frontend: `frontend/package.json`

2. **Update CHANGELOG.md**

3. **Create release branch:**
   ```bash
   git checkout -b release/v1.0.0
   ```

4. **Run full test suite**

5. **Create release on GitHub**

6. **Deploy to production**

## Getting Help

### Communication Channels

- **GitHub Issues:** For bugs and feature requests
- **GitHub Discussions:** For questions and general discussion
- **Email:** For sensitive issues

### Resources

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)
- [Code Style Guide](docs/CODE_STYLE_GUIDE.md)

## Recognition

Contributors will be recognized in:

- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Project documentation

Thank you for contributing to JewGo! 🎉 