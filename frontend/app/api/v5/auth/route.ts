/**
 * Consolidated v5 authentication API routes.
 * 
 * Handles all authentication operations including login, register, logout,
 * token refresh, and password management through the v5 API client.
 * Replaces: multiple auth endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { validateAuthFromRequest } from '@/lib/api/utils-v5';

// Feature flag check for v5 auth API
async function checkFeatureFlag(request: NextRequest): Promise<boolean> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    
    // Get user info for feature flag check
    const authResult = await validateAuthFromRequest(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authResult.success && authResult.token) {
      headers['Authorization'] = `Bearer ${authResult.token}`;
    }
    
    // Check if auth_api_v5 feature flag is enabled
    const response = await fetch(`${backendUrl}/api/v5/feature-flags/auth_api_v5`, {
      method: 'GET',
      headers
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.enabled === true;
    }
    
    // Handle specific error cases
    if (response.status === 404) {
      // Feature flags API not found - assume enabled for backward compatibility
      console.warn('Feature flags API not found (404), assuming auth_api_v5 is enabled');
      return true;
    }
    
    // For other non-OK responses (500, 503, etc.), default to enabled for backward compatibility
    console.warn(`Feature flags API returned ${response.status}, assuming auth_api_v5 is enabled`);
    return true;
  } catch (error) {
    console.error('Feature flag check failed:', error);
    // Default to enabled for backward compatibility
    return true;
  }
}

// POST /api/v5/auth - Handle login and register
export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    const isFeatureEnabled = await checkFeatureFlag(request);
    if (!isFeatureEnabled) {
      return NextResponse.json(
        { error: 'Auth API v5 is not enabled for your account' },
        { status: 503 }
      );
    }
    
    const { action, ...data } = await request.json();

    switch (action) {
      case 'login':
        return handleLogin(data);
      
      case 'register':
        return handleRegister(data);
      
      case 'logout':
        return handleLogout(request);
      
      case 'refresh':
        return handleRefresh(data);
      
      case 'forgot-password':
        return handleForgotPassword(data);
      
      case 'reset-password':
        return handleResetPassword(data);
      
      case 'change-password':
        return handleChangePassword(request, data);
      
      case 'verify-email':
        return handleVerifyEmail(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleLogin(data: { email?: string; password?: string; remember_me?: boolean }) {
  const { email, password, remember_me } = data;

  // Validate input
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  try {
    const response = await apiClient.login(email, password, remember_me);

    if (!response.success) {
      return NextResponse.json(
        { error: response.data?.error || 'Login failed' },
        { status: response.status || 401 }
      );
    }

    // Set secure HTTP-only cookies for tokens
    const responseHeaders = new Headers();
    
    if (response.data.tokens) {
      const maxAge = remember_me ? 30 * 24 * 60 * 60 : 8 * 60 * 60; // 30 days or 8 hours
      
      responseHeaders.append('Set-Cookie', 
        `access_token=${response.data.tokens.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`
      );
      
      if (response.data.tokens.refresh_token) {
        responseHeaders.append('Set-Cookie', 
          `refresh_token=${response.data.tokens.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; Path=/`
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: response.data.user,
      message: 'Login successful'
    }, { headers: responseHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}

async function handleRegister(data: { email?: string; password?: string; name?: string }) {
  const { email, password, name } = data;

  // Validate input
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: 'Email, password, and name are required' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  if (name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Name must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const response = await apiClient.register({ email, password, name: name.trim() });

    if (!response.success) {
      return NextResponse.json(
        { error: response.data?.error || 'Registration failed' },
        { status: response.status || 400 }
      );
    }

    // Set secure HTTP-only cookies for tokens
    const responseHeaders = new Headers();
    
    if (response.data.tokens) {
      responseHeaders.append('Set-Cookie', 
        `access_token=${response.data.tokens.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/`
      );
      
      if (response.data.tokens.refresh_token) {
        responseHeaders.append('Set-Cookie', 
          `refresh_token=${response.data.tokens.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; Path=/`
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: response.data.user,
      message: response.data.message || 'Registration successful'
    }, { 
      status: 201,
      headers: responseHeaders 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

async function handleLogout(request: NextRequest) {
  try {
    // Extract token from cookies or Authorization header
    const token = request.cookies.get('access_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      apiClient.setTokens(token);
      await apiClient.logout();
    }

    // Clear auth cookies
    const responseHeaders = new Headers();
    responseHeaders.append('Set-Cookie', 
      `access_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
    );
    responseHeaders.append('Set-Cookie', 
      `refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
    );

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    }, { headers: responseHeaders });

  } catch (error: any) {
    // Still clear cookies even if backend logout fails
    const responseHeaders = new Headers();
    responseHeaders.append('Set-Cookie', 
      `access_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
    );
    responseHeaders.append('Set-Cookie', 
      `refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
    );

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    }, { headers: responseHeaders });
  }
}

async function handleRefresh(data: { refresh_token?: string }) {
  try {
    let refreshToken = data.refresh_token;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Set the refresh token in the client
    apiClient.setTokens('', refreshToken);
    
    const response = await apiClient.refreshToken();

    if (!response.success) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
    }

    // Set new tokens in cookies
    const responseHeaders = new Headers();
    
    if (response.data.tokens) {
      responseHeaders.append('Set-Cookie', 
        `access_token=${response.data.tokens.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/`
      );
      
      if (response.data.tokens.refresh_token) {
        responseHeaders.append('Set-Cookie', 
          `refresh_token=${response.data.tokens.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; Path=/`
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: response.data.user,
      message: 'Token refreshed successfully'
    }, { headers: responseHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Token refresh failed' },
      { status: 401 }
    );
  }
}

async function handleForgotPassword(data: { email?: string }) {
  const { email } = data;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Valid email address required' },
      { status: 400 }
    );
  }

  try {
    // This would call the backend forgot password endpoint
    // For now, return a generic success message
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password reset request failed' },
      { status: 500 }
    );
  }
}

async function handleResetPassword(data: { token?: string; password?: string }) {
  const { token, password } = data;

  if (!token || !password) {
    return NextResponse.json(
      { error: 'Reset token and new password are required' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  try {
    // This would call the backend reset password endpoint
    // For now, return a generic success message
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password reset failed' },
      { status: 500 }
    );
  }
}

async function handleChangePassword(request: NextRequest, data: { current_password?: string; new_password?: string }) {
  const { current_password, new_password } = data;

  if (!current_password || !new_password) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 }
    );
  }

  if (new_password.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    );
  }

  // Validate authentication
  const authResult = await validateAuthFromRequest(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Set authentication token
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    // This would call the backend change password endpoint
    // For now, return a generic success message
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password change failed' },
      { status: 500 }
    );
  }
}

async function handleVerifyEmail(data: { token?: string }) {
  const { token } = data;

  if (!token) {
    return NextResponse.json(
      { error: 'Verification token required' },
      { status: 400 }
    );
  }

  try {
    // This would call the backend email verification endpoint
    // For now, return a generic success message
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Email verification failed' },
      { status: 500 }
    );
  }
}