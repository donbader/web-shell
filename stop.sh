#!/bin/bash

# Web Shell - Stop Script (Docker Compose)

echo "🛑 Stopping Web Shell..."

# Check if we're in the project root
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Stop and remove Docker containers
docker compose -f docker-compose.dev.yml down

echo "✅ All services stopped"
