# Build Testing Guidelines

## 🚨 IMPORTANT: Always Test Build Before Pushing

To prevent build errors from reaching production, we have implemented automatic build testing.

## 🔧 Automatic Build Testing

### Git Pre-Push Hook
A pre-push hook has been configured to automatically test the build before every push:

```bash
# The hook will run automatically when you push
git push origin main
```

If the build fails, the push will be blocked and you'll see an error message.

### Manual Build Testing
You can also test the build manually:

```bash
# Option 1: Use the test script
./scripts/test-build.sh

# Option 2: Run build directly
cd frontend && npm run build
```

## 📋 Build Testing Checklist

Before pushing any changes, ensure:

1. ✅ **TypeScript compilation** passes
2. ✅ **All imports** are valid
3. ✅ **No console errors** in development
4. ✅ **All components** render without errors
5. ✅ **API endpoints** are properly typed

## 🐛 Common Build Issues

### TypeScript Errors
- Invalid property names in object literals
- Missing imports
- Incorrect type definitions

### Import Errors
- Missing dependencies
- Incorrect file paths
- Circular dependencies

### Component Errors
- Missing required props
- Invalid JSX syntax
- Undefined variables

## 🛠️ Fixing Build Errors

1. **Read the error message** carefully
2. **Check the file and line number** mentioned
3. **Fix the specific issue** (type, import, syntax)
4. **Test the build again** before pushing
5. **Commit and push** only after successful build

## 📝 Best Practices

- **Test builds frequently** during development
- **Fix errors immediately** when they appear
- **Don't push broken builds** - it blocks the team
- **Use TypeScript strictly** to catch errors early
- **Keep dependencies updated** to avoid conflicts

## 🔄 CI/CD Integration

The build testing is also integrated into our CI/CD pipeline:
- **Vercel** automatically tests builds on every push
- **Failed builds** prevent deployment
- **Build logs** are available in the deployment dashboard

## 📞 Getting Help

If you encounter persistent build issues:
1. Check the [TypeScript documentation](https://www.typescriptlang.org/docs/)
2. Review recent changes for breaking modifications
3. Ask for help in the team chat
4. Create an issue with build error details
