import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

import { FeedbackData } from '@/types';
import { logInfo, logError, logApiCall } from '@/lib/utils/logger';


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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['correction', 'suggestion', 'general'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
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

    // Send to backend API
    const startTime = Date.now();
    const backendResponse = await fetch(`${process.env['NEXT_PUBLIC_BACKEND_URL']}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env['ADMIN_TOKEN']}`,
      },
      body: JSON.stringify(backendData),
    });
    const duration = Date.now() - startTime;
    logApiCall('/api/feedback', 'POST', backendResponse.status, duration, {
      feedbackId: feedbackData.id,
      type: feedbackData.type,
      priority: feedbackData.priority
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      logError('Backend API error', { 
        status: backendResponse.status, 
        feedbackId: feedbackData.id,
        error: errorText 
      });
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Send notification email if contact email provided
    if (contactEmail) {
      try {
        await sendNotificationEmail(contactEmail, feedbackData);
      } catch (error) {
        logError('Failed to send notification email', { 
          feedbackId: feedbackData.id, 
          email: contactEmail 
        }, error instanceof Error ? error : new Error('Unknown error'));
        // Don't fail the request if email fails
      }
    }

    // Send admin notification
    try {
      await sendAdminNotification(feedbackData);
    } catch (error) {
      logError('Failed to send admin notification', { 
        feedbackId: feedbackData.id 
      }, error instanceof Error ? error : new Error('Unknown error'));
      // Don't fail the request if admin notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackData.id,
    });

  } catch (error) {
    logError('Error processing feedback', {}, error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendNotificationEmail(email: string, feedbackData: FeedbackData) {
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  // For now, we'll just log it
      logInfo('Sending notification email', { email, feedbackId: feedbackData.id });
  
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
      logInfo('Sending admin notification', { feedbackId: feedbackData.id });
  
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

    // Fetch feedback from backend
    const backendResponse = await fetch(
      `${process.env['NEXT_PUBLIC_BACKEND_URL']}/api/feedback?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env['ADMIN_TOKEN']}`,
        },
      }
    );

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    logError('Error fetching feedback', {}, error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 