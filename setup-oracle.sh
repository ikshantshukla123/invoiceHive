#!/bin/bash
# ─────────────────────────────────────────────────────────────
# InvoiceHive — Oracle VM Setup Script
# Ubuntu 22.04 (Ampere ARM compatible)
# ─────────────────────────────────────────────────────────────

set -e
set -o pipefail

echo "Starting Oracle VM setup..."

# 1. update system
echo "Updating packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. install docker
echo "Installing Docker..."

sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y

sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-compose-plugin

# 3. docker permissions
echo "Setting docker permissions..."
sudo usermod -aG docker $USER

# 4. enable docker
sudo systemctl enable docker
sudo systemctl start docker

# 5. install certbot
echo "Installing certbot..."
sudo apt-get install -y certbot

# 6. create project folder
echo "Creating app folder..."
mkdir -p ~/invoicehive

# 7. open firewall
echo "Configuring firewall..."

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# optional dashboards
sudo ufw allow 15672/tcp
sudo ufw allow 9001/tcp

sudo ufw --force enable

# 8. verify
echo ""
echo "Docker version:"
docker --version

echo ""
echo "Docker compose version:"
docker compose version

echo ""
echo " Oracle VM ready"
echo ""
echo "Next steps:"
echo "1. logout & login again"
echo "2. git clone repo"
echo "3. add .env"
echo "4. docker compose up -d --build"