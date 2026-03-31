#!/bin/bash

# ========================================
# InvoiceHive Docker Quick Start Script
# ========================================

set -e

echo "🚀 InvoiceHive Docker Setup"
echo "============================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed: $(docker --version)"
echo "✅ Docker Compose is installed: $(docker-compose --version)"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your credentials:"
    echo "   - MongoDB URI"
    echo "   - JWT secrets"
    echo "   - Razorpay keys"
    echo "   - OAuth credentials (optional)"
    echo "   - SMTP settings (optional)"
    echo ""
    read -p "Press Enter after you've configured .env file..."
fi

echo "📦 Starting Docker services..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ InvoiceHive is starting up!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:  http://localhost"
echo "   API:       http://localhost/api"
echo "   RabbitMQ:  http://localhost:15672 (guest/guest)"
echo "   MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart:          docker-compose restart"
echo ""
echo "💡 First startup may take 5-10 minutes to download images."
echo "   Check logs with: docker-compose logs -f"
echo ""
