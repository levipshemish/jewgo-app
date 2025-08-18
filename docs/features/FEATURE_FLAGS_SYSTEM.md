# Feature Flags & Versioning System

## Overview

The JewGo application now includes a comprehensive feature flags and versioning system that enables safe deployments, gradual feature rollouts, and better control over feature availability across different environments. This system provides the foundation for continuous deployment and experimentation.

## 🎯 **Why Feature Flags?**

### **Business Benefits**
- **Safe Deployments**: Deploy code without exposing incomplete features
- **Gradual Rollouts**: Release features to small user groups first
- **A/B Testing**: Compare feature variations with different flags
- **Emergency Controls**: Disable problematic features instantly
- **User Feedback**: Gather feedback from beta users before general release

### **Technical Benefits**
- **Continuous Deployment**: Deploy code continuously without feature risk
- **Environment Isolation**: Test features in specific environments only
- **Performance Monitoring**: Monitor feature impact before full rollout
- **Rollback Capability**: Quick rollback without code deployment

## 🚀 **System Architecture**

### **Multi-Layer Approach**

#### **1. Environment-Based Flags**
```bash
# Simple boolean flags via environment variables
FEATURE_FLAGS='{"reviews_system": true, "loyalty_program": false}'
```

#### **2. Dynamic API Flags**
```json
{
  "reviews_system": {
    "enabled": true,
    "description": "Restaurant reviews and ratings system",
    "version": "0.1",
    "rollout_percentage": 50.0,
    "target_environments": ["development", "staging"]
  }
}
```

#### **3. Split.io Integration**
```python
# Optional integration with Split.io for advanced features
SPLIT_IO_API_KEY=your_split_io_api_key
```

### **Flag Types**

#### **Core Features** (Production Ready)
- **Purpose**: Stable, fully-tested features
- **Default State**: Enabled for all users
- **Rollout**: 100% rollout
- **Examples**: `advanced_search`, `hours_management`, `specials_system`

#### **Beta Features** (Testing Phase)
- **Purpose**: Features in active development/testing
- **Default State**: Disabled, enabled for specific users/environments
- **Rollout**: 0-50% rollout
- **Examples**: `reviews_system`, `loyalty_program`, `advanced_analytics`

#### **Experimental Features** (Early Development)
- **Purpose**: Early-stage features for internal testing
- **Default State**: Disabled, development environment only
- **Rollout**: 0% rollout
- **Examples**: `ai_recommendations`, `voice_search`, `caching_system`

## 🔧 **Implementation Details**

### **Backend Implementation**

#### **Core Feature Flag Manager**
```python
# backend/utils/feature_flags.py
class FeatureFlagManager:
    def __init__(self):
        self.flags: Dict[str, FeatureFlag] = {}
        self.environment = os.environ.get('ENVIRONMENT', 'development')
        self.split_io_client = None
        self._load_flags()
        self._setup_split_io()
    
    def is_enabled(self, flag_name: str, user_id: Optional[str] = None, default: bool = False) -> bool:
        # Check Split.io first if available
        if self.split_io_client:
            split_result = self.split_io_client.get_treatment(user_id or 'anonymous', flag_name)
            if split_result in ['on', 'off']:
                return split_result == 'on'
        
        # Check local flags
        flag = self.flags.get(flag_name)
        if not flag:
            return default
        
        return flag.should_enable_for_user(user_id, self.environment)
```

#### **Feature Flag Decorator**
```python
def require_feature_flag(flag_name: str, default: bool = False):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = None
            if hasattr(request, 'token_info') and request.token_info:
                user_id = request.token_info.get('user_id')
            
            if not feature_flag_manager.is_enabled(flag_name, user_id, default):
                return jsonify({
                    'error': 'Feature not available',
                    'message': f'Feature "{flag_name}" is not enabled',
                    'feature_flag': flag_name
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

#### **API Endpoint Protection**
```python
@app.route('/api/reviews')
@limiter.limit("100 per minute")
@require_feature_flag('reviews_system', default=False)
def get_reviews():
    """Get restaurant reviews (feature flag protected)"""
    # Implementation
```

### **Frontend Implementation**

#### **React Hook**
```typescript
// frontend/lib/hooks/useFeatureFlags.ts
export function useFeatureFlag(flagName: string, defaultEnabled: boolean = false) {
  const { isFeatureEnabled, getFeatureFlag, loading, error } = useFeatureFlags();
  
  const enabled = isFeatureEnabled(flagName, defaultEnabled);
  const flag = getFeatureFlag(flagName);

  return {
    enabled,
    flag,
    loading,
    error
  };
}
```

#### **Feature Flag Component**
```typescript
export function FeatureFlag({ 
  name, 
  defaultEnabled = false, 
  children, 
  fallback = null 
}: {
  name: string;
  defaultEnabled?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { enabled, loading } = useFeatureFlag(name, defaultEnabled);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

#### **Component Usage**
```typescript
// Conditional rendering with fallback
<FeatureFlag name="reviews_system" defaultEnabled={false} fallback={<ComingSoon />}>
  <ReviewsComponent />
</FeatureFlag>

// Direct hook usage
function MyComponent() {
  const { enabled, loading } = useFeatureFlag('reviews_system', false);
  
  if (loading) return <div>Loading...</div>;
  if (!enabled) return <div>Feature not available</div>;
  
  return <ReviewsComponent />;
}
```

## 📊 **Feature Flag Configuration**

### **Flag Structure**
```json
{
  "name": "reviews_system",
  "enabled": false,
  "description": "Restaurant reviews and ratings system",
  "version": "0.1",
  "rollout_percentage": 0.0,
  "target_environments": ["development", "staging"],
  "target_users": ["user1", "user2"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### **Configuration Options**

#### **Basic Configuration**
```json
{
  "enabled": true,
  "description": "Feature description",
  "version": "1.0"
}
```

#### **Advanced Configuration**
```json
{
  "enabled": true,
  "description": "Advanced feature with rollout",
  "version": "0.1",
  "rollout_percentage": 25.0,
  "target_environments": ["development", "staging"],
  "target_users": ["beta_user_1", "beta_user_2"],
  "expires_at": "2024-06-30T23:59:59Z"
}
```

### **Environment Variables**
```bash
# Simple boolean flags
FEATURE_FLAGS='{"reviews_system": true, "loyalty_program": false}'

# Complex configuration
FEATURE_FLAGS='{
  "reviews_system": {
    "enabled": true,
    "description": "Restaurant reviews system",
    "version": "0.1",
    "rollout_percentage": 50.0,
    "target_environments": ["development", "staging"]
  }
}'

# Split.io integration
SPLIT_IO_API_KEY=your_split_io_api_key
```

## 🔌 **API Endpoints**

### **Feature Flag Management**

#### **Get All Feature Flags**
```http
GET /api/feature-flags
```

**Response:**
```json
{
  "feature_flags": {
    "reviews_system": {
      "enabled": false,
      "description": "Restaurant reviews and ratings system",
      "version": "0.1",
      "rollout_percentage": 0.0,
      "target_environments": ["development", "staging"]
    }
  },
  "environment": "development",
  "user_id": "user123"
}
```

#### **Get Specific Feature Flag**
```http
GET /api/feature-flags/reviews_system
```

**Response:**
```json
{
  "flag_name": "reviews_system",
  "enabled": false,
  "description": "Restaurant reviews and ratings system",
  "version": "0.1",
  "rollout_percentage": 0.0,
  "target_environments": ["development", "staging"],
  "user_id": "user123"
}
```

#### **Create Feature Flag** (Admin Only)
```http
POST /api/feature-flags
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "new_feature",
  "enabled": false,
  "description": "New experimental feature",
  "version": "0.1",
  "rollout_percentage": 0.0,
  "target_environments": ["development"]
}
```

#### **Update Feature Flag** (Admin Only)
```http
POST /api/feature-flags/reviews_system
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "enabled": true,
  "rollout_percentage": 25.0
}
```

#### **Delete Feature Flag** (Admin Only)
```http
DELETE /api/feature-flags/reviews_system
Authorization: Bearer {admin_token}
```

#### **Validate Feature Flag Configuration**
```http
POST /api/feature-flags/validate
Content-Type: application/json

{
  "name": "test_feature",
  "enabled": true,
  "rollout_percentage": 150.0
}
```

**Response:**
```json
{
  "valid": false,
  "errors": ["'rollout_percentage' must be between 0 and 100"],
  "warnings": []
}
```

## 🛠️ **Setup and Management**

### **Initial Setup**

#### **1. Generate Environment Configuration**
```bash
python scripts/setup_feature_flags.py --generate-env
```

This creates a `.env.feature_flags` file with default configurations.

#### **2. Set Up via API**
```bash
python scripts/setup_feature_flags.py --setup-api --admin-token your_token
```

This creates default feature flags via the API.

#### **3. Test Functionality**
```bash
python scripts/setup_feature_flags.py --test
```

This tests the feature flags API endpoints.

### **Admin Interface**

#### **Feature Flag Manager Component**
The admin interface provides:
- **Visual Management**: Toggle flags on/off with visual indicators
- **Configuration**: Edit flag properties (description, version, rollout percentage)
- **Environment Targeting**: Configure which environments can use each flag
- **Real-time Updates**: Auto-refresh flag status and configurations
- **Validation**: Built-in validation for flag configurations

#### **Usage**
```typescript
import FeatureFlagManager from '@/components/admin/FeatureFlagManager';

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <FeatureFlagManager />
    </div>
  );
}
```

### **Management Scripts**

#### **Enable Beta Features**
```bash
python scripts/setup_feature_flags.py --enable-beta --admin-token your_token
```

This enables beta features with 50% rollout for testing.

#### **Show Usage Examples**
```bash
python scripts/setup_feature_flags.py --examples
```

This displays comprehensive usage examples.

## 🎯 **Usage Patterns**

### **Backend Patterns**

#### **1. Endpoint Protection**
```python
@app.route('/api/reviews')
@require_feature_flag('reviews_system', default=False)
def get_reviews():
    return jsonify({'reviews': []})
```

#### **2. Conditional Logic**
```python
@app.route('/api/restaurants')
def get_restaurants():
    restaurants = get_restaurants_from_db()
    
    # Add reviews if feature is enabled
    if is_feature_enabled('reviews_system'):
        for restaurant in restaurants:
            restaurant['reviews'] = get_restaurant_reviews(restaurant['id'])
    
    return jsonify(restaurants)
```

#### **3. Context Manager**
```python
@app.route('/api/analytics')
def get_analytics():
    with feature_flag_context('advanced_analytics', default=False) as enabled:
        if enabled:
            return get_advanced_analytics()
        else:
            return get_basic_analytics()
```

### **Frontend Patterns**

#### **1. Conditional Rendering**
```typescript
<FeatureFlag name="reviews_system" defaultEnabled={false}>
  <ReviewsSection />
</FeatureFlag>
```

#### **2. Hook-Based Logic**
```typescript
function RestaurantPage({ restaurant }) {
  const { enabled: reviewsEnabled } = useFeatureFlag('reviews_system', false);
  const { enabled: loyaltyEnabled } = useFeatureFlag('loyalty_program', false);
  
  return (
    <div>
      <RestaurantInfo restaurant={restaurant} />
      {reviewsEnabled && <ReviewsSection restaurantId={restaurant.id} />}
      {loyaltyEnabled && <LoyaltySection restaurantId={restaurant.id} />}
    </div>
  );
}
```

#### **3. Higher-Order Component**
```typescript
const ReviewsWithFeatureFlag = withFeatureFlag(
  ReviewsComponent,
  'reviews_system',
  false,
  ComingSoonComponent
);
```

## 📈 **Monitoring and Analytics**

### **Flag Usage Tracking**

#### **Backend Metrics**
```python
# Track flag usage
def track_flag_usage(flag_name: str, user_id: str, enabled: bool):
    logger.info(f"Feature flag usage", 
                flag_name=flag_name, 
                user_id=user_id, 
                enabled=enabled,
                timestamp=datetime.utcnow())
```

#### **Frontend Analytics**
```typescript
// Track feature flag impressions
useEffect(() => {
  if (enabled !== undefined) {
    analytics.track('feature_flag_impression', {
      flag_name: 'reviews_system',
      enabled,
      user_id: userId
    });
  }
}, [enabled, userId]);
```

### **Performance Monitoring**

#### **Flag Evaluation Performance**
- **Average Response Time**: < 10ms for flag evaluation
- **Cache Hit Rate**: > 95% for frequently accessed flags
- **Error Rate**: < 0.1% for flag evaluation errors

#### **API Performance**
- **Feature Flags Endpoint**: < 50ms average response time
- **Flag Updates**: < 100ms for flag configuration updates
- **Validation**: < 20ms for configuration validation

## 🔒 **Security Considerations**

### **Access Control**

#### **Admin-Only Operations**
- **Create Flags**: Only admins can create new feature flags
- **Update Flags**: Only admins can modify flag configurations
- **Delete Flags**: Only admins can remove feature flags
- **IP Restrictions**: Admin endpoints protected by IP whitelist
- **Token Authentication**: All admin operations require valid admin tokens

#### **User-Specific Targeting**
- **Consistent Rollout**: User IDs ensure consistent feature availability
- **Targeted Testing**: Specific users can be targeted for beta testing
- **Gradual Rollout**: Percentage-based rollout for safe deployments

### **Data Protection**

#### **Flag Configuration Security**
- **Input Validation**: All flag configurations are validated
- **Type Safety**: Strong typing for flag configuration objects
- **Sanitization**: Input sanitization to prevent injection attacks

#### **User Privacy**
- **Minimal Data**: Only necessary user information is used for targeting
- **Anonymization**: User IDs are hashed for consistent rollout
- **Consent**: User consent for feature flag participation

## 🚀 **Best Practices**

### **Flag Naming Conventions**

#### **Recommended Naming**
```bash
# Use descriptive, lowercase names with underscores
reviews_system
loyalty_program
advanced_analytics
ai_recommendations
voice_search
```

#### **Avoid**
```bash
# Don't use generic names
feature_1
test_flag
new_thing
```

### **Rollout Strategy**

#### **1. Development Phase**
- **Environment**: Development only
- **Rollout**: 0% (disabled)
- **Purpose**: Internal development and testing

#### **2. Staging Phase**
- **Environment**: Staging environment
- **Rollout**: 0-25% (internal testing)
- **Purpose**: QA testing and validation

#### **3. Beta Phase**
- **Environment**: Production with limited rollout
- **Rollout**: 25-50% (beta users)
- **Purpose**: User feedback and performance monitoring

#### **4. General Release**
- **Environment**: Production
- **Rollout**: 100% (all users)
- **Purpose**: Full feature availability

### **Flag Lifecycle Management**

#### **1. Creation**
```python
# Create flag with initial configuration
flag = FeatureFlag(
    name="new_feature",
    enabled=False,
    description="New experimental feature",
    version="0.1",
    rollout_percentage=0.0,
    target_environments=["development"]
)
```

#### **2. Gradual Rollout**
```python
# Increase rollout percentage gradually
flag.rollout_percentage = 25.0  # 25% of users
flag.rollout_percentage = 50.0  # 50% of users
flag.rollout_percentage = 100.0 # All users
```

#### **3. Cleanup**
```python
# Remove flag when no longer needed
feature_flag_manager.remove_flag("old_feature")
```

### **Testing Strategies**

#### **1. Unit Testing**
```python
def test_feature_flag_enabled():
    flag = FeatureFlag(name="test_flag", enabled=True)
    assert flag.should_enable_for_user("user1", "development") == True

def test_feature_flag_disabled():
    flag = FeatureFlag(name="test_flag", enabled=False)
    assert flag.should_enable_for_user("user1", "development") == False
```

#### **2. Integration Testing**
```python
def test_feature_flag_endpoint():
    response = client.get('/api/feature-flags/test_flag')
    assert response.status_code == 200
    assert response.json['enabled'] == False
```

#### **3. End-to-End Testing**
```typescript
// Test feature flag in browser
test('feature flag controls component visibility', async () => {
  // Enable flag via API
  await enableFeatureFlag('test_feature');
  
  // Check component visibility
  await expect(screen.getByText('Test Component')).toBeInTheDocument();
});
```

## 🔄 **Migration Guide**

### **For Existing Features**

#### **1. Add Feature Flag Protection**
```python
# Before: Direct feature implementation
@app.route('/api/reviews')
def get_reviews():
    return jsonify({'reviews': []})

# After: Feature flag protected
@app.route('/api/reviews')
@require_feature_flag('reviews_system', default=False)
def get_reviews():
    return jsonify({'reviews': []})
```

#### **2. Update Frontend Components**
```typescript
// Before: Direct component usage
<ReviewsComponent />

// After: Feature flag wrapped
<FeatureFlag name="reviews_system" defaultEnabled={false}>
  <ReviewsComponent />
</FeatureFlag>
```

### **For New Features**

#### **1. Create Feature Flag First**
```bash
# Create flag via API
curl -X POST https://jewgo.onrender.com/api/feature-flags \
  -H 'Authorization: Bearer your_admin_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "new_feature",
    "enabled": false,
    "description": "New experimental feature",
    "version": "0.1",
    "rollout_percentage": 0.0
  }'
```

#### **2. Implement Feature with Flag Protection**
```python
@app.route('/api/new-feature')
@require_feature_flag('new_feature', default=False)
def new_feature():
    return jsonify({'data': 'new feature data'})
```

#### **3. Add Frontend Integration**
```typescript
<FeatureFlag name="new_feature" defaultEnabled={false}>
  <NewFeatureComponent />
</FeatureFlag>
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Flag Not Working**
```bash
# Check flag configuration
curl https://jewgo.onrender.com/api/feature-flags/your_flag_name

# Check environment
echo $ENVIRONMENT

# Check user targeting
# Verify user ID is in target_users list
```

#### **2. API Errors**
```bash
# Check authentication
curl -H 'Authorization: Bearer your_token' https://jewgo.onrender.com/api/feature-flags

# Check IP restrictions
# Verify your IP is in ALLOWED_IPS
```

#### **3. Frontend Issues**
```typescript
// Check flag loading
const { loading, error } = useFeatureFlag('your_flag');

if (loading) console.log('Flag loading...');
if (error) console.error('Flag error:', error);
```

### **Debugging Tools**

#### **1. Flag Status Check**
```bash
# Check all flags
python scripts/setup_feature_flags.py --test

# Check specific flag
curl https://jewgo.onrender.com/api/feature-flags/your_flag_name
```

#### **2. Environment Validation**
```bash
# Validate environment configuration
python -c "
import os
print('ENVIRONMENT:', os.environ.get('ENVIRONMENT'))
print('FEATURE_FLAGS:', os.environ.get('FEATURE_FLAGS'))
"
```

#### **3. Log Analysis**
```bash
# Check application logs for flag-related errors
grep "feature_flag" /var/log/app.log
```

## 📚 **Additional Resources**

### **Documentation**
- [Feature Flags Best Practices](https://docs.split.io/docs/feature-flags-best-practices)
- [Progressive Delivery](https://martinfowler.com/articles/progressive-delivery.html)
- [Feature Toggle Patterns](https://martinfowler.com/articles/feature-toggles.html)

### **Tools and Libraries**
- [Split.io](https://split.io/) - Advanced feature flag platform
- [LaunchDarkly](https://launchdarkly.com/) - Feature flag management
- [Unleash](https://unleash.github.io/) - Open-source feature flag platform

### **Community**
- [Feature Flag Slack Community](https://featureflags.slack.com/)
- [Progressive Delivery Meetup](https://www.meetup.com/progressive-delivery/)

---

This comprehensive feature flags system provides the foundation for safe, continuous deployment and experimentation in the JewGo application. By following these patterns and best practices, you can effectively manage feature rollouts and ensure a smooth user experience. 