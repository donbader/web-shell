#!/bin/bash

# Web Shell - Development Server Startup Script (Docker Compose)

set -e  # Exit on error

echo "🚀 Starting Web Shell with Docker Compose..."

# Check if we're in the project root
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "   Please start Docker and try again"
    exit 1
fi

# Run pre-flight checks (TypeScript type checking)
echo ""
if [ -f "preflight.sh" ]; then
    if ! ./preflight.sh; then
        echo ""
        echo "💡 Tip: Fix TypeScript errors above, then run ./start.sh again"
        exit 1
    fi
else
    echo "⚠️  Warning: preflight.sh not found, skipping type checks"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Docker Compose services..."
    docker compose -f docker-compose.dev.yml down
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup INT TERM

# Stop any existing containers and clean up
echo ""
echo "🧹 Cleaning up existing containers and volumes..."
docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true

# Build development backend and frontend images only
echo ""
echo "🔨 Building development images..."
if ! docker compose -f docker-compose.dev.yml build; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo "✅ Development images built successfully"
echo "ℹ️  Terminal environment images will be built on-demand when first requested"

# Start services
echo ""
echo "🚀 Starting services..."
if ! docker compose -f docker-compose.dev.yml up -d; then
    echo "❌ Failed to start services"
    exit 1
fi

# Wait for services to initialize
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 8

# Check if containers are running
BACKEND_RUNNING=$(docker compose -f docker-compose.dev.yml ps backend -q 2>/dev/null)
FRONTEND_RUNNING=$(docker compose -f docker-compose.dev.yml ps frontend -q 2>/dev/null)

if [ -z "$BACKEND_RUNNING" ]; then
    echo "❌ Backend container is not running"
    echo ""
    echo "Backend logs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker compose -f docker-compose.dev.yml logs backend
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cleanup
fi

if [ -z "$FRONTEND_RUNNING" ]; then
    echo "❌ Frontend container is not running"
    echo ""
    echo "Frontend logs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker compose -f docker-compose.dev.yml logs frontend
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cleanup
fi

# Check for errors in logs
BACKEND_ERRORS=$(docker compose -f docker-compose.dev.yml logs backend 2>&1 | grep -i "error\|failed\|not found" | head -5)
if [ -n "$BACKEND_ERRORS" ]; then
    echo "⚠️  Backend may have errors:"
    echo "$BACKEND_ERRORS"
    echo ""
fi

echo ""
echo "✅ Web Shell is running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend:  http://localhost:3366"
echo "  Frontend: http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 View logs with:"
echo "   Backend:  docker compose -f docker-compose.dev.yml logs -f backend"
echo "   Frontend: docker compose -f docker-compose.dev.yml logs -f frontend"
echo "   All:      docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 Press Ctrl+C to stop services"
echo ""
echo "━━━━━━━━━━━━━━━━━ Live Logs ━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Follow logs from both services
docker compose -f docker-compose.dev.yml logs -f
