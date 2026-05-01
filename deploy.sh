#!/bin/bash
set -e
echo "🚀 InvoiceHive EC2 Deployment"
echo "================================"
echo ""
echo "📦 Installing Docker..."
sudo apt update -y && sudo apt install -y docker.io docker-compose git curl
sudo usermod -aG docker ubuntu
echo "✅ Docker installed"
echo ""
echo "🔐 Installing SSL..."
sudo apt install -y certbot python3-certbot-nginx
if ! sudo test -f /etc/letsencrypt/live/api.ikshant.me/fullchain.pem; then
    sudo certbot certonly --standalone -d api.ikshant.me --non-interactive --agree-tos --email ikshantshukla24@gmail.com
    sudo systemctl enable certbot.timer
fi
echo "✅ SSL certificate ready"
echo ""
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📝 Create it: cp .env.prod .env && nano .env"
    exit 1
fi
echo "✅ .env file found"
echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d
sleep 30
echo "✅ Services started"
echo ""
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🎉 Deployment complete!"
echo "Test: curl https://api.ikshant.me/health"
