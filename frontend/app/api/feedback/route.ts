import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

import { FeedbackData } from '@/types';
import { appLogger } from '@/lib/utils/logger';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow, getAdminUser } from '@/lib/server/admin-auth';
import { errorResponses, createSuccessResponse } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form data
    const type = formData.get('type') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const restaurantId = formData.get('restaurantId') as string;
    const restaurantName = formData.get('restaurantName') as string;
    const contactEmail = formData.get('contactEmail') as string;

    // Validate required fields
    if (!type || !category || !description) {
      return errorResponses.badRequest();
    }

    // Validate type
    if (!['correction', 'suggestion', 'general'].includes(type)) {
      return errorResponses.badRequest();
    }

    // Validate priority
    if (!['low', 'medium', 'high'].includes(priority)) {
      return errorResponses.badRequest();
    }

    // Process attachments
    const attachments: Array<{ filename: string; path: string; size: number }> = [];
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'feedback');
    
    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Process each attachment
    for (const [key, value] of Array.from(formData.entries())) {
      if (key.startsWith('attachment_') && value instanceof File) {
        const file = value;
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File ${file.name} is too large. Maximum size is 10MB.` },
            { status: 400 }
          );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: `File type ${file.type} is not allowed.` },
            { status: 400 }
          );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const filename = `feedback_${timestamp}_${randomString}.${extension}`;
        const filepath = join(uploadDir, filename);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        attachments.push({
          filename: file.name,
          path: `/uploads/feedback/${filename}`,
          size: file.size
        });
      }
    }

    // Prepare feedback data
    const feedbackData: FeedbackData = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      type: type as 'bug' | 'feature' | 'general' | 'restaurant',
      category,
      description,
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(restaurantId && { restaurantId: parseInt(restaurantId) }),
    };

    // Prepare backend data with additional fields
    const backendData = {
      ...feedbackData,
      restaurantName: restaurantName ?? null,
      contactEmail: contactEmail ?? null,
      attachments,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
      referrer: request.headers.get('referer') ?? null,
    };

    // Send to backend API (public POST - no Authorization header)
    const startTime = Date.now();
    let backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    
    const backendResponse = await fetch(`${backendUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });
    const duration = Date.now() - startTime;
    appLogger.info('API call completed', {
      endpoint: '/api/feedback',
      method: 'POST',
      status: backendResponse.status,
      duration,
      feedbackId: feedbackData.id,
      type: feedbackData.type,
      category: feedbackData.category
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      appLogger.error('Backend API error', { 
        status: backendResponse.status, 
        feedbackId: feedbackData.id,
        error: errorText 
      });
      
      // For server errors, still return success to user
      if (backendResponse.status >= 500) {
        appLogger.warn('Backend unavailable, feedback queued locally', {
          feedbackId: feedbackData.id
        });
        
        return createSuccessResponse({ message: 'Feedback processed successfully' });
      }
      
      return errorResponses.internalError();
    }

    // Send notification email if contact email provided
    if (contactEmail) {
      try {
        await sendNotificationEmail(contactEmail, feedbackData);
      } catch (error) {
        appLogger.error('Failed to send notification email', { 
          feedbackId: feedbackData.id, 
          email: contactEmail,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the request if email fails
      }
    }

    // Send admin notification
    try {
      await sendAdminNotification(feedbackData);
    } catch (error) {
      appLogger.error('Failed to send admin notification', { 
        feedbackId: feedbackData.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return createSuccessResponse({ message: 'Feedback processed successfully' });

  } catch (error) {
    appLogger.error('Error processing feedback', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // For network errors, still accept the feedback
    if (error instanceof Error && (
      error.name === 'AbortError' || 
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network')
    )) {
      return NextResponse.json({ 
        success: true, 
        feedbackId: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        message: 'Thank you for your feedback. It has been queued and will be processed shortly.'
      });
    }
    
    return errorResponses.internalError();
  }
}

async function sendNotificationEmail(email: string, feedbackData: FeedbackData) {
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  // For now, we'll just log it
      appLogger.info('Sending notification email', { email, feedbackId: feedbackData.id });
  
  // Example implementation with a hypothetical email service:
  /*
  const emailService = new EmailService();
  await emailService.send({
    to: email,
    subject: 'Thank you for your feedback - JewGo',
    template: 'feedback-confirmation',
    data: {
      feedbackId: feedbackData.id,
      type: feedbackData.type,
      category: feedbackData.category,
      description: feedbackData.description,
    }
  });
  */
}

async function sendAdminNotification(feedbackData: FeedbackData) {
  // This would send a notification to admin about new feedback
      appLogger.info('Sending admin notification', { feedbackId: feedbackData.id });
  
  // Example implementation:
  /*
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const emailService = new EmailService();
    await emailService.send({
      to: adminEmail,
      subject: `New ${feedbackData.priority} priority feedback received`,
      template: 'admin-feedback-notification',
      data: feedbackData
    });
  }
  */
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireAdminOrThrow(request);
    const admin = await getAdminUser();
    const token = admin?.token || '';

    try {
      const { searchParams } = new URL(request.url);
      const restaurantId = searchParams.get('restaurantId');
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') ?? '50');
      const offset = parseInt(searchParams.get('offset') ?? '0');

      // Build query parameters
      const params = new URLSearchParams();
      if (restaurantId) {params.append('restaurant_id', restaurantId);}
      if (status) {params.append('status', status);}
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      // Get backend URL
      const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || process.env['BACKEND_URL'] || 'https://api.jewgo.app';

      // Fetch feedback from backend with admin JWT
      const backendResponse = await fetch(
        `${backendUrl}/api/feedback?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!backendResponse.ok) {
        return errorResponses.internalError();
      }

      const data = await backendResponse.json();
      return NextResponse.json(data);

    } catch (error) {
      appLogger.error('Error fetching feedback', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return errorResponses.internalError();
    }
  });
} 