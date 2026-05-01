#!/bin/bash
set -e

echo "🚀 InvoiceHive EC2 Deployment"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "✅ .env file found"
echo ""

echo "🛑 Stopping old services..."
docker compose down 2>/dev/null || true

echo "🏗️ Building images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 30

echo "🏥 Service status:"
docker compose ps

echo ""
echo "🎉 Deployment complete!"
echo "Test: curl https://api.ikshant.me/health"
