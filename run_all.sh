#!/bin/bash

echo "🏔️ Starting Scottish Mountain Weather System..."
echo "============================================"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Run weather scraper first to get fresh data
echo ""
echo "🌦️  Running weather scraper to fetch latest data..."
cd "$(dirname "$0")"
python weather_scraper.py
echo "✅ Weather data updated!"

# Start backend API
echo ""
echo "🔧 Starting backend API server..."
cd backend
source venv/bin/activate 2>/dev/null || {
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn python-multipart aiofiles
}
nohup python simple_api.py > api.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "✅ Backend API started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
curl -s http://localhost:8000/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend API is running at http://localhost:8000"
else
    echo "❌ Backend API failed to start. Check backend/api.log for errors"
    exit 1
fi

# Start frontend
echo ""
echo "🎨 Starting frontend application..."
cd frontend
npm install --silent 2>/dev/null || npm install
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to start..."
sleep 5

# Display status
echo ""
echo "============================================"
echo "✅ All services are running!"
echo "============================================"
echo ""
echo "📱 Frontend:     http://localhost:3000"
echo "🔧 Backend API:  http://localhost:8000"
echo "📚 API Docs:     http://localhost:8000/docs"
echo ""
echo "📊 Latest weather data has been fetched"
echo ""
echo "To stop all services, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop watching (services will continue running)"
echo "============================================"

# Store PIDs for easy cleanup
echo "$BACKEND_PID $FRONTEND_PID" > .running_pids

# Keep script running to show logs
tail -f backend/api.log frontend/frontend.log