/**
 * VFS Slot Check API Route
 * 
 * Proxies requests to the Python VFS Slot Checker service.
 */

import { type NextRequest, NextResponse } from 'next/server';

const VFS_CHECKER_URL = process.env.VFS_CHECKER_URL || 'http://localhost:8000';

export interface SlotCheckRequest {
  sourceCountry: string;
  destinationCountry: string;
  visaCenter: string;
  visaCategory: string;
  visaSubCategory: string;
  email: string;
  password: string;
  headless?: boolean;
}

export interface SlotInfo {
  date: string;
  time?: string;
  location?: string;
  appointmentType?: string;
}

export interface SlotCheckResponse {
  success: boolean;
  message: string;
  slots: SlotInfo[];
  checkedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SlotCheckRequest = await request.json();

    // Validate required fields
    const requiredFields = ['sourceCountry', 'destinationCountry', 'visaCenter', 'visaCategory', 'visaSubCategory', 'email', 'password'];
    for (const field of requiredFields) {
      if (!body[field as keyof SlotCheckRequest]) {
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
      headless: body.headless ?? true,
    };

    // Call Python service
    const response = await fetch(`${VFS_CHECKER_URL}/api/check-slot`, {
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
          error: errorData.detail || 'VFS slot check failed',
          success: false 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform response to camelCase
    const result: SlotCheckResponse = {
      success: data.success,
      message: data.message,
      slots: data.slots.map((slot: { date: string; time?: string; location?: string; appointment_type?: string }) => ({
        date: slot.date,
        time: slot.time,
        location: slot.location,
        appointmentType: slot.appointment_type,
      })),
      checkedAt: data.checked_at,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('VFS check-slot error:', error);
    
    // Check if Python service is reachable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'VFS Checker service unavailable. Please ensure the service is running.',
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
