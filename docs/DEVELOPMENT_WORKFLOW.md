# Development Workflow - Global Rule

Quick links: Contributor guidelines live in `docs/AGENTS.md`. Agent guardrails/workflow live in the root `AGENTS.md`.

## 🚨 Mandatory Development Rule

**ALWAYS test, commit, and push changes after making any modifications to the system.**

This rule is **mandatory** for all contributors and applies to **every change** made to the codebase.

## Why This Rule Exists

- **Code Quality**: Ensures all changes are tested before being committed
- **Continuous Integration**: Maintains a clean, deployable codebase
- **Team Collaboration**: Prevents merge conflicts and integration issues
- **Production Safety**: Reduces the risk of deploying broken code
- **Immediate Feedback**: Catches issues early in the development process

## Required Workflow

### Step 1: Test Your Changes

Before committing any changes, you must run the complete test suite:

```bash
# Backend Testing
cd backend
pytest                    # Run all backend tests
flake8 .                 # Code linting
mypy .                   # Type checking

# Frontend Testing
cd frontend
npm test                 # Run all frontend tests
npm run type-check       # TypeScript type checking
npm run lint             # Code linting

# Alternative: Fast TypeScript Error Checking
npx tsc --noEmit         # Fast TypeScript compilation check (no build artifacts)
npx tsc --noEmit --watch # Watch mode for real-time error checking
```

### Step 2: Commit Your Changes

Use descriptive commit messages following conventional commit format:

```bash
git add .
git commit -m "feat: add new restaurant search functionality"
git commit -m "fix: resolve authentication token issue"
git commit -m "docs: update API documentation"
```

### Step 3: Push to Repository

Push your changes to the main branch:

```bash
git push origin main
```

## Automated Workflow Script

We provide an automated script that handles the entire workflow:

```bash
# From the project root directory
./scripts/test-and-commit.sh "your commit message here"

# Or run interactively
./scripts/test-and-commit.sh
```

The script will:
1. ✅ Run all backend tests (pytest, flake8, mypy)
2. ✅ Run all frontend tests (jest, type-check, lint)
3. ✅ Commit your changes with the provided message
4. ✅ Push to the main branch
5. ✅ Provide a summary of the workflow

## Commit Message Guidelines

Follow conventional commit format:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -m "feat: add restaurant filtering by kosher category"
git commit -m "fix: resolve user authentication timeout issue"
git commit -m "docs: update deployment instructions"
git commit -m "test: add unit tests for restaurant API endpoints"
```

## Error Checking Best Practices

### TypeScript Error Checking (Recommended)

**Fastest Method:**
```bash
npx tsc --noEmit
```
- **Pros**: Fast, shows all TypeScript errors at once, no build artifacts
- **Use when**: You want to quickly check for type errors without building

**Watch Mode:**
```bash
npx tsc --noEmit --watch
```
- **Pros**: Watches for changes and re-checks automatically
- **Use when**: Actively developing and want real-time feedback

**Next.js Type Check:**
```bash
npm run type-check
```
- **Pros**: Uses Next.js's built-in type checking
- **Use when**: You want framework-specific type checking

### ESLint Error Checking

```bash
npx eslint . --ext .ts,.tsx
```
- **Pros**: Catches both TypeScript and linting issues
- **Use when**: You want comprehensive code quality checks

### Build Error Checking

```bash
npm run build
```
- **Pros**: Full build process, catches runtime issues
- **Cons**: Slower, creates build artifacts
- **Use when**: Final verification before deployment

### Error Checking Priority

1. **During Development**: Use `npx tsc --noEmit --watch` for real-time feedback
2. **Before Committing**: Use `npx tsc --noEmit` for quick verification
3. **Before Pushing**: Use `npm run build` for final verification
4. **CI/CD**: Use `npm run type-check` and `npm run lint` for automated checks

## Exceptions

### Emergency Hotfixes
For critical production issues that require immediate fixes:
1. Make the minimal necessary change
2. Test the specific fix
3. Commit and push immediately
4. **Follow up with comprehensive testing within 1 hour**

### Experimental Branches
For experimental features:
1. Create a feature branch clearly marked as experimental
2. Follow the testing workflow on the branch
3. **Do not merge to main until fully tested**

## Enforcement

### Pre-commit Hooks
The project includes pre-commit hooks that automatically run:
- Code formatting (black, prettier)
- Linting (flake8, eslint)
- Type checking (mypy, TypeScript)

### CI/CD Pipeline
The continuous integration pipeline will:
- Run all tests on every push
- Block deployment if tests fail
- Require all checks to pass before merging

### Team Accountability
- All team members are responsible for following this rule
- Code reviews should verify that tests were run
- Regular team check-ins should include workflow compliance

## Troubleshooting

### Tests Failing
If tests fail during the workflow:
1. **Do not commit or push** until tests pass
2. Fix the failing tests
3. Re-run the entire test suite
4. Only proceed when all tests pass

### Script Issues
If the automated script fails:
1. Check that you're in the project root directory
2. Verify all dependencies are installed
3. Run the manual workflow steps
4. Report script issues to the team

### Environment Issues
If you encounter environment-specific issues:
1. Check the [Environment Setup Guide](setup/ENVIRONMENT_SETUP.md)
2. Ensure all required tools are installed
3. Verify environment variables are set correctly
4. Contact the team for assistance

## Best Practices

### Before Making Changes
1. Ensure your local environment is up to date
2. Pull the latest changes from main
3. Verify all existing tests pass

### During Development
1. Write tests for new functionality
2. Run tests frequently during development
3. Keep commits small and focused
4. Use descriptive commit messages

### After Making Changes
1. Run the complete test suite
2. Verify no new linting errors
3. Check that type checking passes
4. Commit and push immediately

## Monitoring and Feedback

### Success Metrics
- Zero broken builds in main branch
- All tests passing consistently
- Quick feedback on code changes
- Reduced integration issues

### Continuous Improvement
- Regular review of workflow effectiveness
- Updates to testing requirements as needed
- Team feedback on workflow improvements
- Automation enhancements

## Support

If you have questions about this workflow:
- Check the [Contributing Guide](CONTRIBUTING.md)
- Review the [Testing Documentation](testing/README.md)
- Contact the development team
- Report issues through GitHub Issues

---

**Remember: This rule exists to maintain code quality and team productivity. Following it consistently benefits everyone on the project.**

# Development Workflow

## Environment Configuration

### Environment Variables Setup

The project now uses a centralized environment configuration approach:

- **Root `.env` file**: Primary source of truth for all environment variables
- **Backend `config.env`**: Legacy file (fallback support maintained for backward compatibility)

#### Migration from backend/config.env

If you have an existing `backend/config.env` file, you can migrate to the new structure:

```bash
# Run the migration script
python scripts/migrate-env-config.py
```

This script will:
1. Load variables from both `backend/config.env` and root `.env`
2. Merge them, preferring existing root `.env` values
3. Save the result to the root `.env` file
4. Optionally create a backup of the old config file

#### Manual Setup

1. Create a `.env` file in the project root:
   ```bash
   cp config/environment/templates/development.env.example .env
   ```

2. Update the `.env` file with your specific values:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/jewgo_db
   
   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   
   # API Keys
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

#### Environment Loading Priority

The application loads environment variables in this order:
1. System environment variables (highest priority)
2. Root `.env` file
3. `backend/config.env` file (fallback for backward compatibility)

### Backend Local Server

To run the backend server locally:

```bash
# From project root
cd backend
python app.py
```

The server will automatically load environment variables from the root `.env` file.

### Build Process

The build script now checks for the root `.env` file and provides clear messaging:

```bash
# From project root
./scripts/build.sh
```

The build process will:
1. Check for root `.env` file
2. Install dependencies
3. Set up Playwright browsers
4. Verify the installation

## Development Workflow

### Prerequisites

1. **Python 3.11+** installed
2. **Node.js 18+** installed (for frontend)
3. **PostgreSQL** database running
4. **Redis** server running (optional, for caching)
5. **Environment variables** configured in root `.env`

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd jewgo-app
   ```

2. **Install dependencies**:
   ```bash
   # Backend dependencies
   cd backend
   pip install -r requirements.txt
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Copy and configure environment file
   cp config/environment/templates/development.env.example .env
   # Edit .env with your specific values
   ```

4. **Start development servers**:
   ```bash
   # Backend (from project root)
   cd backend && python app.py
   
   # Frontend (in another terminal, from project root)
   cd frontend && npm run dev
   ```

### Database Setup

1. **Create database**:
   ```sql
   CREATE DATABASE jewgo_db;
   ```

2. **Run migrations**:
   ```bash
   cd backend
   python -m database.setup_database
   ```

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Backend linting
cd backend
flake8 .
black .
isort .

# Frontend linting
cd frontend
npm run lint
npm run type-check
```

## Troubleshooting

### Environment Variables Not Loading

1. **Check file location**: Ensure `.env` is in the project root
2. **Check file format**: Variables should be `KEY=value` format
3. **Check permissions**: Ensure the file is readable
4. **Restart server**: Environment changes require server restart

### Database Connection Issues

1. **Verify DATABASE_URL** in `.env`
2. **Check PostgreSQL** is running
3. **Verify credentials** and permissions
4. **Check network** connectivity

### Redis Connection Issues

1. **Verify REDIS_URL** in `.env`
2. **Check Redis** server is running
3. **Verify port** and authentication
4. **Check firewall** settings

## Best Practices

1. **Never commit `.env` files** to version control
2. **Use environment-specific** `.env` files for different deployments
3. **Validate environment** variables on application startup
4. **Use strong, unique** values for secrets and API keys
5. **Rotate credentials** regularly
6. **Monitor environment** variable usage in logs
