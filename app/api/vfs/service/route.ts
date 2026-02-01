/**
 * VFS Service Status and Control API Route
 * 
 * Checks if the Python VFS service is running and can start it if needed.
 */

import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

const VFS_CHECKER_URL = process.env.VFS_CHECKER_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Check if the service is running
    const response = await fetch(`${VFS_CHECKER_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        running: true,
        status: 'online',
        service: data.service,
        version: data.version,
      });
    }

    return NextResponse.json({
      running: false,
      status: 'offline',
      error: 'Service not responding',
    });

  } catch (error) {
    return NextResponse.json({
      running: false,
      status: 'offline',
      error: error instanceof Error ? error.message : 'Service unavailable',
    });
  }
}

export async function POST() {
  try {
    // First check if already running
    try {
      const checkResponse = await fetch(`${VFS_CHECKER_URL}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (checkResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Service is already running',
          alreadyRunning: true,
        });
      }
    } catch {
      // Service not running, continue to start it
    }

    // Get the path to the VFS checker service
    // This assumes the service is in travelhub/services/vfs-slot-checker
    const workspaceRoot = process.cwd();
    const servicePath = path.join(workspaceRoot, 'services', 'vfs-slot-checker');
    const pythonPath = path.join(servicePath, 'venv', 'bin', 'python');
    const serverScript = path.join(servicePath, 'api_server.py');

    // Start the service in the background
    const command = `cd "${servicePath}" && nohup "${pythonPath}" "${serverScript}" > /tmp/vfs-checker.log 2>&1 &`;
    
    await execAsync(command);

    // Wait a moment for the service to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify it started
    try {
      const verifyResponse = await fetch(`${VFS_CHECKER_URL}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (verifyResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Service started successfully',
        });
      }
    } catch {
      // Service may still be starting
    }

    return NextResponse.json({
      success: true,
      message: 'Service start command executed. It may take a few seconds to be ready.',
      pending: true,
    });

  } catch (error) {
    console.error('Failed to start VFS service:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start service',
      },
      { status: 500 }
    );
  }
}
