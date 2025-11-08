#!/bin/bash

# Web Shell - Stop Development Servers

echo "🛑 Stopping Web Shell servers..."

# Check if PID files exist
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ Backend stopped (PID: $BACKEND_PID)"
    rm .backend.pid
else
    echo "⚠️  No backend PID file found"
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
    rm .frontend.pid
else
    echo "⚠️  No frontend PID file found"
fi

# Clean up log files
rm -f backend.log frontend.log

echo ""
echo "🧹 Cleanup complete!"
