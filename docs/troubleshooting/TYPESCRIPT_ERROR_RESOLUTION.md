# TypeScript Error Resolution Guide

## Quick Error Checking Commands

### Fast TypeScript Error Detection
```bash
# Fastest method - shows all errors at once
npx tsc --noEmit

# Watch mode for real-time feedback
npx tsc --noEmit --watch

# Next.js specific type checking
npm run type-check
```

## Common TypeScript Error Patterns & Solutions

### 1. Property Access Errors

**Error Pattern:**
```
Property 'propertyName' does not exist on type 'InterfaceName'
```

**Common Causes:**
- Interface mismatch between data structures
- Property name typos
- Missing properties in interface definitions

**Solutions:**
```typescript
// Check interface definition
interface MyInterface {
  propertyName: string; // Ensure property exists
}

// Use optional chaining
const value = data?.propertyName;

// Use type assertion (if confident)
const value = (data as any).propertyName;
```

### 2. Type Assignment Errors

**Error Pattern:**
```
Type 'ActualType' is not assignable to type 'ExpectedType'
```

**Common Causes:**
- Array type mismatches (string[] vs (string | undefined)[])
- Object literal property mismatches
- Function parameter type mismatches

**Solutions:**
```typescript
// Filter undefined values
const filteredArray = array.filter(Boolean) as string[];

// Type assertion for object properties
const obj: ExpectedType = {
  ...actualObj,
  property: actualValue as ExpectedPropertyType
};

// Function parameter mapping
function processData(data: ActualType) {
  const mappedData: ExpectedType = {
    // Map properties correctly
  };
  return mappedData;
}
```

### 3. Import/Export Errors

**Error Pattern:**
```
Module 'moduleName' declares 'ExportName' locally, but it is not exported
```

**Common Causes:**
- Missing export statements
- Incorrect import paths
- Case sensitivity issues in file names

**Solutions:**
```typescript
// Ensure proper export
export interface MyInterface { }
export type MyType = string;
export function myFunction() { }

// Check import path case sensitivity
import { MyInterface } from './MyFile'; // vs './myfile'
```

### 4. Spread Operator Errors

**Error Pattern:**
```
A spread argument must either have a tuple type or be passed to a rest parameter
```

**Common Causes:**
- Using spread operator with non-array types
- Function signature mismatches

**Solutions:**
```typescript
// Instead of spreading args
function wrapper(...args: any[]) {
  return targetFunction(...args); // ❌ Error
}

// Pass individual arguments
function wrapper(...args: any[]) {
  return targetFunction(args[0], args[1], args[2]); // ✅ Correct
}
```

## Mapping File Error Resolution

### Data Structure Mapping Issues

**Problem:** Interface mismatches between database models and component props

**Solution Pattern:**
```typescript
// 1. Define clear interfaces
interface SourceData {
  oldProperty: string;
  nested: { value: string };
}

interface TargetData {
  newProperty: string;
  flatValue: string;
}

// 2. Create mapping function
function mapSourceToTarget(source: SourceData): TargetData {
  return {
    newProperty: source.oldProperty,
    flatValue: source.nested.value,
  };
}
```

### Mock Data Structure Updates

**Problem:** Mock data doesn't match updated interfaces

**Solution:**
```typescript
// Update mock data to match interface
const mockData: UpdatedInterface = {
  // Remove old properties
  // oldProperty: value, ❌
  
  // Add new properties
  newProperty: value, // ✅
  requiredProperty: value, // ✅
};
```

## Error Resolution Workflow

### Step 1: Identify Error Type
```bash
npx tsc --noEmit
```
- Read error messages carefully
- Note file paths and line numbers
- Identify error patterns

### Step 2: Check Interface Definitions
- Verify source and target interfaces
- Check for missing properties
- Ensure type compatibility

### Step 3: Update Mapping Functions
- Fix property access patterns
- Update type assertions
- Handle optional properties

### Step 4: Update Mock Data
- Align mock data with interfaces
- Remove deprecated properties
- Add required properties

### Step 5: Verify Fixes
```bash
npx tsc --noEmit
```
- Run until no errors remain
- Test with build if needed

## Prevention Strategies

### 1. Use Strict TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. Regular Type Checking
- Run `npx tsc --noEmit` frequently during development
- Use watch mode for real-time feedback
- Check types before committing

### 3. Interface Documentation
- Document interface changes
- Update related interfaces together
- Use TypeScript comments for complex types

### 4. Incremental Updates
- Update interfaces and implementations together
- Test changes incrementally
- Avoid large interface changes

## Tools and Resources

### TypeScript Playground
- [TypeScript Playground](https://www.typescriptlang.org/play/) for testing type issues

### VS Code Extensions
- TypeScript Importer
- Error Lens
- TypeScript Hero

### Debugging Commands
```bash
# Check specific file
npx tsc --noEmit path/to/file.ts

# Check with specific config
npx tsc --noEmit --project tsconfig.json

# Generate declaration files for debugging
npx tsc --declaration --emitDeclarationOnly
```

## Common Pitfalls to Avoid

1. **Using `any` type** - Prefer proper typing
2. **Ignoring type errors** - Fix them immediately
3. **Inconsistent interfaces** - Keep them synchronized
4. **Missing null checks** - Handle optional properties
5. **Over-complex types** - Break them down into smaller interfaces

## Emergency Fixes

### When Build is Broken
1. Run `npx tsc --noEmit` to identify all errors
2. Fix critical errors first (blocking compilation)
3. Use type assertions temporarily if needed
4. Document TODO items for proper fixes later

### When Interface Changes are Complex
1. Create new interfaces alongside old ones
2. Update implementations incrementally
3. Use union types for backward compatibility
4. Remove old interfaces after migration
