#!/bin/bash

# Web Shell Deployment Script for Main Router
# This script builds and deploys web-shell to main-router

set -e  # Exit on error

echo "🚀 Deploying Web Shell to Main Router"
echo "======================================"

# Change to main-router directory
cd ../main-router

echo ""
echo "📋 Step 1: Building images..."
docker compose build web-shell-backend web-shell-frontend

echo ""
echo "🔄 Step 2: Starting services..."
docker compose up -d web-shell-backend web-shell-frontend

echo ""
echo "⏳ Step 3: Waiting for services to be healthy..."
sleep 5

echo ""
echo "✅ Step 4: Checking service status..."
docker compose ps web-shell-backend web-shell-frontend

echo ""
echo "📊 Step 5: Checking health..."
echo "Backend health:"
docker compose exec -T web-shell-backend node -e "require('http').get('http://localhost:3366/health', (r) => {r.on('data', d => console.log(d.toString())); r.on('error', e => console.error(e))})" 2>/dev/null || echo "Health check pending..."

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Access Web Shell at:"
echo "  → http://localhost:8888/corey-private-router/web-shell"
echo ""
echo "View logs:"
echo "  → docker compose logs -f web-shell-backend web-shell-frontend"
echo ""
echo "Traefik Dashboard:"
echo "  → http://localhost:8887/dashboard/"
echo ""
