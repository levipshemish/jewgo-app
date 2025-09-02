# React Hooks ESLint Guide: Preventing Infinite Loading Issues

## 🎯 **Overview**

This guide explains how to use the `react-hooks/exhaustive-deps` ESLint rule to catch dependency issues early and prevent infinite loading problems in your React components.

## ✅ **ESLint Rule Configuration**

The rule is now enabled in your `.eslintrc.json`:

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": ["error", {
      "additionalHooks": "(useRecoilCallback|useRecoilTransaction_UNSTABLE)"
    }]
  }
}
```

## 🚀 **Available Scripts**

### **Check for Hook Dependency Issues**
```bash
npm run lint:hooks
```

### **Auto-fix Hook Dependency Issues (when possible)**
```bash
npm run lint:hooks:fix
```

### **Full Linting with Hook Rules**
```bash
npm run lint
```

### **Strict Linting (no warnings allowed)**
```bash
npm run lint:strict
```

## 🔍 **What the Rule Catches**

### **1. Missing Dependencies in useEffect**
```typescript
// ❌ PROBLEM: Missing dependency
useEffect(() => {
  fetchData(userId);
}, []); // Missing: userId

// ✅ SOLUTION: Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### **2. Missing Dependencies in useCallback**
```typescript
// ❌ PROBLEM: Missing dependency
const handleSubmit = useCallback(async (data) => {
  await submitData(data, userId);
}, []); // Missing: userId

// ✅ SOLUTION: Include all dependencies
const handleSubmit = useCallback(async (data) => {
  await submitData(data, userId);
}, [userId]);
```

### **3. Missing Dependencies in useMemo**
```typescript
// ❌ PROBLEM: Missing dependency
const filteredData = useMemo(() => {
  return data.filter(item => item.category === selectedCategory);
}, [data]); // Missing: selectedCategory

// ✅ SOLUTION: Include all dependencies
const filteredData = useMemo(() => {
  return data.filter(item => item.category === selectedCategory);
}, [data, selectedCategory]);
```

### **4. Circular Dependencies**
```typescript
// ❌ PROBLEM: Circular dependency
const fetchData = useCallback(async () => {
  // ... fetch logic
}, [fetchData]); // Circular: fetchData depends on itself

// ✅ SOLUTION: Remove circular dependency
const fetchData = useCallback(async () => {
  // ... fetch logic
}, [userId, setData]); // Only include actual dependencies
```

## 🛠️ **Common Fixes**

### **State Setters Don't Need Dependencies**
```typescript
// ✅ CORRECT: State setters are stable
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const data = await api.getData();
    setData(data);
  } finally {
    setLoading(false);
  }
}, [userId]); // Only include userId, not setLoading, setData
```

### **Functions from Props Need Dependencies**
```typescript
// ✅ CORRECT: Include prop functions
const handleSubmit = useCallback(async (data) => {
  await onSubmit(data);
}, [onSubmit]); // Include onSubmit prop
```

### **Objects and Arrays Need Dependencies**
```typescript
// ❌ PROBLEM: Object recreated on every render
const config = { apiUrl: '/api', timeout: 5000 };
useEffect(() => {
  fetchData(config);
}, []); // Missing: config

// ✅ SOLUTION: Memoize the object
const config = useMemo(() => ({
  apiUrl: '/api',
  timeout: 5000
}), []);

useEffect(() => {
  fetchData(config);
}, [config]);
```

## 🔧 **Advanced Patterns**

### **Custom Hooks with Dependencies**
```typescript
// ✅ CORRECT: Custom hook with proper dependencies
function useDataFetching(userId: string) {
  const [data, setData] = useState(null);
  
  const fetchData = useCallback(async () => {
    const result = await api.getData(userId);
    setData(result);
  }, [userId]); // Include userId dependency
  
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Include fetchData dependency
  
  return { data, refetch: fetchData };
}
```

### **Event Handlers with Dependencies**
```typescript
// ✅ CORRECT: Event handler with proper dependencies
const handleClick = useCallback((event) => {
  if (isEnabled && userPermissions.includes('edit')) {
    onEdit(itemId);
  }
}, [isEnabled, userPermissions, onEdit, itemId]);
```

### **API Calls with Dependencies**
```typescript
// ✅ CORRECT: API call with proper dependencies
const fetchRestaurants = useCallback(async () => {
  const params = new URLSearchParams({
    lat: userLocation.lat.toString(),
    lng: userLocation.lng.toString(),
    radius: searchRadius.toString()
  });
  
  const response = await fetch(`/api/restaurants?${params}`);
  const data = await response.json();
  setRestaurants(data);
}, [userLocation.lat, userLocation.lng, searchRadius]); // Include location and radius
```

## 🚨 **When to Disable the Rule**

### **Intentionally Empty Dependencies**
```typescript
// ✅ CORRECT: Intentionally empty with comment
useEffect(() => {
  // This effect should only run once on mount
  initializeApp();
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### **Complex Dependencies**
```typescript
// ✅ CORRECT: Complex dependency logic
useEffect(() => {
  if (shouldFetch && !isLoading && !data) {
    fetchData();
  }
}, [shouldFetch, isLoading, data, fetchData]); // All dependencies included
```

## 📋 **Best Practices**

### **1. Always Include Dependencies**
- Include all variables, functions, and objects used inside the hook
- Don't exclude dependencies unless absolutely necessary

### **2. Memoize Expensive Objects**
- Use `useMemo` for objects and arrays that are recreated on every render
- Use `useCallback` for functions that are passed as props

### **3. Keep Dependencies Minimal**
- Only include what's actually used inside the hook
- Avoid including unnecessary dependencies

### **4. Use ESLint Comments Sparingly**
- Only disable the rule when you have a clear reason
- Add explanatory comments when disabling

### **5. Test Your Fixes**
- Run the linter after making changes
- Test the component to ensure it still works correctly

## 🔍 **Troubleshooting**

### **Common Error Messages**

#### **"React Hook useEffect has missing dependencies"**
```typescript
// ❌ Error
useEffect(() => {
  fetchData(userId);
}, []);

// ✅ Fix
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

#### **"React Hook useCallback has missing dependencies"**
```typescript
// ❌ Error
const handleSubmit = useCallback(() => {
  onSubmit(data);
}, []);

// ✅ Fix
const handleSubmit = useCallback(() => {
  onSubmit(data);
}, [onSubmit, data]);
```

#### **"React Hook useMemo has missing dependencies"**
```typescript
// ❌ Error
const filteredData = useMemo(() => {
  return data.filter(item => item.category === category);
}, [data]);

// ✅ Fix
const filteredData = useMemo(() => {
  return data.filter(item => item.category === category);
}, [data, category]);
```

### **Debugging Tips**

1. **Check the ESLint output** for specific missing dependencies
2. **Use React DevTools** to monitor component re-renders
3. **Add console.logs** to see when effects are running
4. **Check the browser console** for infinite loop warnings

## 📚 **Additional Resources**

- [React Hooks ESLint Plugin Documentation](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
- [React Hooks Rules](https://react.dev/warnings/invalid-hook-call-warning)
- [useEffect Dependencies](https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies)

## 🎉 **Benefits**

By following this guide and using the ESLint rule:

- ✅ **Prevent infinite loading** issues early
- ✅ **Catch dependency bugs** before they reach production
- ✅ **Improve performance** by avoiding unnecessary re-renders
- ✅ **Maintain code quality** with automated checks
- ✅ **Learn React best practices** through linting feedback

---

**Remember**: The goal is to have clean, maintainable code that follows React best practices. The ESLint rule is your friend, not your enemy! 🚀
