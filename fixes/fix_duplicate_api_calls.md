# Fix for Duplicate API Calls in Review Components

## Problem
The review components (ReviewForm, ReviewCard, ReviewsSection) are making duplicate API calls to get user information, which can cause session data to be overwritten.

## Solution
Update the `onAuthStateChange` listener to only update the session when there's an actual auth event, not immediately on subscription.

## Code Changes

### 1. ReviewForm.tsx (lines 64-69)
```typescript
// OLD CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async () => {
  const { data: { user } } = await supabaseBrowser.auth.getUser();
  setSession(user ? { user } : null);
  setLoading(false);
});

// NEW CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
  // Only update on actual auth events, not on subscription
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    setSession(session?.user ? { user: session.user } : null);
    setLoading(false);
  }
});
```

### 2. ReviewCard.tsx (lines 74-78)
```typescript
// OLD CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async () => {
  const { data: { user } } = await supabaseBrowser.auth.getUser();
  setSession(user ? { user } : null);
  setLoading(false);
});

// NEW CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
  // Only update on actual auth events, not on subscription
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    setSession(session?.user ? { user: session.user } : null);
    setLoading(false);
  }
});
```

### 3. ReviewsSection.tsx (lines 96-99)
```typescript
// OLD CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async () => {
  const { data: { user } } = await supabaseBrowser.auth.getUser();
  setSession(user ? { user } : null);
});

// NEW CODE:
const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
  // Only update on actual auth events, not on subscription
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    setSession(session?.user ? { user: session.user } : null);
  }
});
```

## Benefits
1. Eliminates duplicate API calls on component mount
2. Prevents session data from being unnecessarily overwritten
3. Reduces API load and improves performance
4. Only updates session state when there's an actual auth change

## Testing
After implementing these changes:
1. Verify that user session is properly loaded on component mount
2. Test that auth state changes (login/logout) still update the UI
3. Check that there are no duplicate network requests in the browser dev tools
4. Ensure reviews functionality continues to work as expected