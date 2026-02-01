/**
 * VFS Supported Countries API Route
 * 
 * Gets list of supported VFS countries and visa centers.
 */

import { NextResponse } from 'next/server';

const VFS_CHECKER_URL = process.env.VFS_CHECKER_URL || 'http://localhost:8000';

export interface CountryDestination {
  code: string;
  name: string;
  visa_centers: Record<string, string[]>;
  visa_categories: string[];
  visa_sub_categories: string[];
}

export interface SupportedCountriesResponse {
  destinations: Record<string, CountryDestination>;
}

export async function GET() {
  try {
    // Call Python service
    const response = await fetch(`${VFS_CHECKER_URL}/api/supported-countries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.detail || 'Failed to get supported countries',
          success: false 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('VFS supported-countries error:', error);
    
    // Check if Python service is reachable
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
