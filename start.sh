#!/bin/bash

# Function to handle exit
cleanup() {
    echo "Stopping servers..."
    kill 0
}

# Catch Ctrl+C and exit signals
trap cleanup EXIT

# Kill any existing processes on the required ports
echo "Checking for existing processes on ports 8000 and 3000..."
lsof -ti:8000 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 8000"
lsof -ti:3000 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 3000"

# Clean up Next.js dev server lock to prevent "Another next dev server is already running"
rm -f frontend/.next/dev/next-dev.pid 2>/dev/null

# Load .env if present
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

sleep 1

echo "Applying database migrations..."
(cd backend && source venv/bin/activate && cd dashboard && python manage.py migrate --noinput)

echo "Starting Backend Server..."
(cd backend && source venv/bin/activate && cd dashboard && python manage.py runserver 0.0.0.0:8000) &

echo "Starting Frontend Server..."
(cd frontend && npm run dev) &

# Wait for both processes to finish
wait
