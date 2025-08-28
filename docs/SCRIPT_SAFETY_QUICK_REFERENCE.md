# Script Safety Quick Reference

## 🚀 Quick Commands

### Daily Development
```bash
# Validate scripts before committing
npm run validate:scripts

# Check for security issues
npm run validate:scripts:verbose

# Generate validation report
npm run validate:scripts:report

# Comprehensive validation
npm run validate:all
```

### CI/CD Integration
- **Automatic validation** runs on every push
- **Script failures** block deployment
- **Security warnings** are reported
- **Detailed logs** in CI/CD dashboard

## 🛡️ Protection Features

### Gitignore Protection
- **Development scripts** ignored by git
- **Script artifacts** (logs, output, cache) ignored
- **Critical production scripts** kept in version control

### Pre-commit Hooks
- **Automatic validation** before commits
- **Syntax checking** for staged scripts
- **Security scanning** for hardcoded secrets
- **Non-blocking warnings** for development scripts

### CI/CD Validation
- **Python script syntax** checking
- **Node.js script syntax** checking
- **Bash script syntax** checking
- **CLI functionality** testing
- **Dependency validation**

## 📁 Script Categories

### ✅ Production Scripts (Versioned)
- `scripts/utils/jewgo-cli.py` - Main CLI
- `scripts/maintenance/` - Maintenance tasks
- `scripts/deployment/` - Deployment automation
- `ci-scripts/` - CI/CD pipeline scripts
- `frontend/scripts/validate-*.js` - Frontend validation

### 🚫 Development Scripts (Gitignored)
- `scripts/dev-*.sh` - Development scripts
- `scripts/test-*.sh` - Testing scripts
- `scripts/debug-*.sh` - Debug scripts
- `scripts/temp/` - Temporary scripts
- `scripts/experimental/` - Experimental scripts

## 🔒 Security Features

### Secret Detection
- **Hardcoded secrets** scanning
- **Environment variable** validation
- **Pattern matching** for common secrets

### Permission Management
- **Execute permission** checking
- **File permission** validation
- **Security vulnerability** scanning

## 📊 Monitoring & Reporting

### Validation Reports
- **JSON format** for programmatic access
- **Human-readable** colored output
- **Error categorization** (errors, warnings, successes)
- **Timestamp tracking** for audit trails

### Common Issues
1. **Script not found**: Check if it's in the correct directory
2. **Permission denied**: Ensure execute permissions
3. **Dependency missing**: Install required packages
4. **Environment variables**: Check `.env` file

## 🎯 Best Practices

### For Developers
1. **Run validation locally** before committing
2. **Check for security issues** regularly
3. **Use dry-run options** when available
4. **Monitor logs and outputs**

### For CI/CD
1. **Don't modify** validation scripts without testing
2. **Follow established patterns** for new scripts
3. **Add validation** for new script types
4. **Document changes** clearly

### For Production
1. **Test in staging** first
2. **Use dry-run options** when available
3. **Monitor logs and outputs**
4. **Have rollback procedures** ready

## 📚 Documentation

- **[Script Safety Implementation](SCRIPT_SAFETY_IMPLEMENTATION.md)** - Complete implementation guide
- **[Scripts README](../scripts/README.md)** - Script usage and safety guidelines
- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** - Deployment with script safety
- **[Contributing Guide](CONTRIBUTING.md)** - Contributing with script validation

## 🆘 Emergency Procedures

### Script Failures
1. **Check logs** for error details
2. **Validate environment** variables
3. **Test dependencies** are available
4. **Rollback** to previous working version

### Security Incidents
1. **Immediately stop** affected scripts
2. **Check for** unauthorized access
3. **Review logs** for suspicious activity
4. **Update credentials** if compromised

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Development Team
