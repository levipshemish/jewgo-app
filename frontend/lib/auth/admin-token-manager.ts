import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AdminToken {
  id: string;
  token: string;
  adminId: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

export class AdminTokenManager {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY_HOURS = 24;
  private static readonly MAX_TOKENS_PER_ADMIN = 5;

  /**
   * Generate a secure random token
   */
  private static generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a new admin token for the authenticated user
   */
  static async createToken(adminId: string): Promise<AdminToken> {
    const token = this.generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store in database (implement your database logic here)
    const adminToken: AdminToken = {
      id: crypto.randomUUID(),
      token,
      adminId,
      createdAt: now,
      expiresAt,
      lastUsed: now,
      isActive: true,
    };

    // Store in database
    try {
      await prisma.adminToken.create({
        data: {
          id: adminToken.id,
          adminId: adminToken.adminId,
          token: adminToken.token,
          expiresAt: adminToken.expiresAt,
          lastUsed: adminToken.lastUsed,
          isActive: adminToken.isActive,
        }
      });
    } catch (error) {
      console.error('Failed to store admin token in database:', error);
      // Continue without database storage for now
    }

    return adminToken;
  }

  /**
   * Validate and refresh admin token
   */
  static async validateToken(token: string): Promise<AdminToken | null> {
    // Fetch from database
    try {
      const dbToken = await prisma.adminToken.findFirst({
        where: { 
          token: token,
          isActive: true 
        }
      });

      if (!dbToken) {
        return null;
      }

      const adminToken: AdminToken = {
        id: dbToken.id,
        adminId: dbToken.adminId,
        token: dbToken.token,
        createdAt: dbToken.createdAt,
        expiresAt: dbToken.expiresAt,
        lastUsed: dbToken.lastUsed,
        isActive: dbToken.isActive,
      };

    if (!adminToken) {
      return null;
    }

    if (adminToken.expiresAt < new Date()) {
      await this.deactivateToken(adminToken.id);
      return null;
    }

    // Update last used
    adminToken.lastUsed = new Date();
    try {
      await prisma.adminToken.update({
        where: { id: adminToken.id },
        data: { lastUsed: adminToken.lastUsed }
      });
    } catch (error) {
      console.error('Failed to update admin token last used:', error);
    }

    return adminToken;
  }

  /**
   * Deactivate a token
   */
  static async deactivateToken(tokenId: string): Promise<void> {
    // Update database
    try {
      await prisma.adminToken.update({
        where: { id: tokenId },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('Failed to deactivate admin token:', error);
    }
  }

  /**
   * Rotate tokens for an admin
   */
  static async rotateTokens(adminId: string): Promise<AdminToken> {
    // Deactivate existing tokens
    try {
      await prisma.adminToken.updateMany({
        where: { adminId, isActive: true },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('Failed to deactivate existing tokens:', error);
    }

    // Create new token
    return await this.createToken(adminId);
  }

  /**
   * Get admin token from request headers
   */
  static getTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Validate admin session and permissions
   */
  static async validateAdminSession(request: NextRequest): Promise<{
    isValid: boolean;
    adminId?: string;
    error?: string;
  }> {
    try {
      // Check Supabase session
      const supabase = await createSupabaseServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.email) {
        return { isValid: false, error: 'No valid session' };
      }

      // Check if user is admin
      const isAdmin = await this.isUserAdmin(session.user.email);
      if (!isAdmin) {
        return { isValid: false, error: 'Insufficient permissions' };
      }

      // Check IP allowlist if configured
      const clientIP = (request as any).ip || request.headers.get('x-forwarded-for')?.split(',')[0];
      if (!this.isIPAllowed(clientIP)) {
        return { isValid: false, error: 'IP not allowed' };
      }

      return { isValid: true, adminId: session.user.id };
    } catch (error) {
      console.error('Admin session validation error:', error);
      return { isValid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Check if user has admin privileges
   */
  private static async isUserAdmin(email: string): Promise<boolean> {
    // TODO: Implement database check - requires NextAuth user schema integration
    // const user = await db.users.findUnique({
    //   where: { email },
    //   select: { isSuperAdmin: true }
    // });
    // return user?.isSuperAdmin || false;

    // Mock implementation - replace with actual database check
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const adminDomains = process.env.ADMIN_DOMAINS?.split(',') || [];
    
    return adminEmails.includes(email) || 
           adminDomains.some(domain => email.endsWith(`@${domain}`));
  }

  /**
   * Check if IP is in allowlist
   */
  private static isIPAllowed(ip: string | null): boolean {
    if (!ip) {
      return true; // Allow if no IP restriction configured
    }
    
    const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
    if (allowedIPs.length === 0) {
      return true; // No restriction
    }
    
    return allowedIPs.includes(ip);
  }
}
