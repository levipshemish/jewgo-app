# Development Workflow - Global Rule

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
