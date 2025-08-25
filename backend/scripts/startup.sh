#!/bin/bash

# Exit on any error
set -e

echo "Starting JewGo Backend API..."

# Run database migrations
echo "Running database migrations..."
python database/migrations/add_current_time_and_hours_parsed.py

# Install Playwright browsers with dependencies
echo "Installing Playwright browsers..."
playwright install chromium --with-deps

# Wait a moment for any background processes
sleep 2

# Start the application with health check
echo "Starting Gunicorn with health monitoring..."
gunicorn --config config/gunicorn.conf.py wsgi:app &

# Store the PID
GUNICORN_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "Shutting down Gunicorn (PID: $GUNICORN_PID)..."
    kill -TERM $GUNICORN_PID 2>/dev/null || true
    wait $GUNICORN_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for the process
wait $GUNICORN_PID 