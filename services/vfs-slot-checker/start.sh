#!/bin/bash

# TravelHub VFS Slot Checker - Start Script
# This script sets up and runs the VFS Slot Checker service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 TravelHub VFS Slot Checker"
echo "=============================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    
    echo "🎭 Installing Playwright browsers..."
    playwright install chromium
fi

# Set port
PORT=${VFS_CHECKER_PORT:-8000}

echo "🚀 Starting VFS Slot Checker API on port $PORT..."
echo "   Health check: http://localhost:$PORT/"
echo "   API docs:     http://localhost:$PORT/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Run the API server
python api_server.py
