#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# InvoiceHive — EC2 Production Setup Script
# ─────────────────────────────────────────────────────────────────────────────
# This script sets up a fresh Ubuntu 22.04 EC2 instance for InvoiceHive
# Run as: sudo bash setup-ec2.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     InvoiceHive Production Setup (Ubuntu 22.04)    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# 1. Update system packages
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git build-essential

# ──────────────────────────────────────────────────────────────────────────────
# 2. Install Docker & Docker Compose
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/7] Installing Docker & Docker Compose...${NC}"

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Add current user to docker group (so we don't need sudo)
usermod -aG docker ubuntu

# Docker Compose (latest)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# ──────────────────────────────────────────────────────────────────────────────
# 3. Install Certbot for SSL/TLS certificates
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/7] Installing Certbot for SSL certificates...${NC}"
apt-get install -y certbot python3-certbot-nginx

# ──────────────────────────────────────────────────────────────────────────────
# 4. Create application directory
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/7] Creating application directory...${NC}"
mkdir -p /home/ubuntu/invoicehive
cd /home/ubuntu/invoicehive
chown -R ubuntu:ubuntu /home/ubuntu/invoicehive

# ──────────────────────────────────────────────────────────────────────────────
# 5. Configure firewall
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/7] Configuring firewall (UFW)...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw --force enable

# ──────────────────────────────────────────────────────────────────────────────
# 6. Create SSL certificate directory
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/7] Creating SSL certificate directory...${NC}"
mkdir -p /etc/letsencrypt
mkdir -p /var/www/certbot

# ──────────────────────────────────────────────────────────────────────────────
# 7. Set up log rotation
# ──────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[7/7] Setting up log rotation...${NC}"
mkdir -p /var/log/invoicehive
cat > /etc/logrotate.d/invoicehive <<'EOF'
/var/log/invoicehive/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        docker-compose -f /home/ubuntu/invoicehive/docker-compose.prod.yml restart > /dev/null 2>&1 || true
    endscript
}
EOF

# ──────────────────────────────────────────────────────────────────────────────
# Setup Complete
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! ✓                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Get SSL certificate for your domain:"
echo "   ${GREEN}sudo certbot certonly --standalone -d api.yourdomain.com -d yourdomain.com${NC}"
echo ""
echo "2. Create .env file in /home/ubuntu/invoicehive/.env with all secrets"
echo ""
echo "3. Pull the latest code:"
echo "   ${GREEN}cd /home/ubuntu/invoicehive && git pull origin main${NC}"
echo ""
echo "4. Start services:"
echo "   ${GREEN}cd /home/ubuntu/invoicehive && docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo "5. Verify health:"
echo "   ${GREEN}curl http://localhost/health${NC}"
echo ""
