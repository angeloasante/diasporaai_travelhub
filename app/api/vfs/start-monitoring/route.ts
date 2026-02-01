/**
 * VFS Monitoring API Route
 * 
 * Start and manage background slot monitoring.
 */

import { type NextRequest, NextResponse } from 'next/server';

const VFS_CHECKER_URL = process.env.VFS_CHECKER_URL || 'http://localhost:8000';

export interface MonitoringRequest {
  sourceCountry: string;
  destinationCountry: string;
  visaCenter: string;
  visaCategory: string;
  visaSubCategory: string;
  email: string;
  password: string;
  checkIntervalMinutes?: number;
  notifyEmail?: string;
  notifyWebhook?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MonitoringRequest = await request.json();

    // Validate required fields
    const requiredFields = ['sourceCountry', 'destinationCountry', 'visaCenter', 'visaCategory', 'visaSubCategory', 'email', 'password'];
    for (const field of requiredFields) {
      if (!body[field as keyof MonitoringRequest]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Transform to Python API format (snake_case)
    const pythonRequest = {
      source_country: body.sourceCountry,
      destination_country: body.destinationCountry,
      visa_center: body.visaCenter,
      visa_category: body.visaCategory,
      visa_sub_category: body.visaSubCategory,
      email: body.email,
      password: body.password,
      check_interval_minutes: body.checkIntervalMinutes ?? 30,
      notify_email: body.notifyEmail,
      notify_webhook: body.notifyWebhook,
    };

    // Call Python service
    const response = await fetch(`${VFS_CHECKER_URL}/api/start-monitoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pythonRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.detail || 'Failed to start monitoring',
          success: false 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: data.success,
      jobId: data.job_id,
      message: data.message,
    });

  } catch (error) {
    console.error('VFS start-monitoring error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'VFS Checker service unavailable',
          success: false 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}
