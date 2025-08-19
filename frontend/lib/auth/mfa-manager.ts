import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

export interface MFASecret {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MFAManager {
  /**
   * Generate a new MFA secret for a user
   */
  static generateSecret(userId: string): MFASecret {
    const secret = authenticator.generateSecret();
    const backupCodes = this.generateBackupCodes();
    
    return {
      id: crypto.randomUUID(),
      userId,
      secret,
      backupCodes,
      isEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate backup codes for account recovery
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Generate a single backup code
   */
  private static generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      console.error('MFA verification error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static verifyBackupCode(mfaSecret: MFASecret, code: string): boolean {
    const index = mfaSecret.backupCodes.findIndex(
      backupCode => backupCode === code.toUpperCase()
    );
    
    if (index !== -1) {
      // Remove used backup code
      mfaSecret.backupCodes.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Generate QR code URL for authenticator apps
   */
  static generateQRCodeUrl(secret: string, email: string, serviceName: string = 'JewGo Admin'): string {
    return authenticator.keyuri(email, serviceName, secret);
  }

  /**
   * Check if MFA is required for admin access
   */
  static isMFARequired(): boolean {
    return process.env.ADMIN_MFA_REQUIRED === 'true';
  }

  /**
   * Validate MFA session
   */
  static async validateMFASession(request: NextRequest): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    if (!this.isMFARequired()) {
      return { isValid: true };
    }

    const mfaToken = request.headers.get('x-mfa-token');
    const userId = request.headers.get('x-user-id');

    if (!mfaToken || !userId) {
      return { isValid: false, error: 'MFA token required' };
    }

    // Fetch MFA secret from database
    let mfaSecret: MFASecret | null = null;
    try {
      const dbMfaSecret = await prisma.mFASecret.findFirst({
        where: { 
          userId,
          isEnabled: true 
        }
      });

      if (!dbMfaSecret) {
        return { isValid: false, error: 'MFA not configured' };
      }

      mfaSecret = {
        id: dbMfaSecret.id,
        userId: dbMfaSecret.userId,
        secret: dbMfaSecret.secret,
        backupCodes: dbMfaSecret.backupCodes,
        isEnabled: dbMfaSecret.isEnabled,
        createdAt: dbMfaSecret.createdAt,
        updatedAt: dbMfaSecret.updatedAt,
      };
    } catch (error) {
      console.error('Failed to fetch MFA secret from database:', error);
      return { isValid: false, error: 'MFA configuration error' };
    }

    if (!mfaSecret) {
      return { isValid: false, error: 'MFA not configured' };
    }

    // Check if token is valid
    if (this.verifyToken(mfaSecret.secret, mfaToken)) {
      return { isValid: true };
    }

    // Check if it's a backup code
    if (this.verifyBackupCode(mfaSecret, mfaToken)) {
      return { isValid: true };
    }

    return { isValid: false, error: 'Invalid MFA token' };
  }
}
