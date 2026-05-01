# 🚀 InvoiceHive — Deployment Guide

Complete guide to deploy InvoiceHive to AWS EC2 with environment-configurable Nginx.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Testing](#local-testing)
3. [GitHub Secrets Setup](#github-secrets-setup)
4. [EC2 Setup](#ec2-setup)
5. [SSL/TLS Certificate](#ssltls-certificate)
6. [First Deployment](#first-deployment)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04, t3.medium or larger)
- GitHub repository with this code
- Domain name pointing to EC2 IP
- Docker Hub account for image registry

---

## Local Testing

Before deploying, test the environment-configurable Nginx locally:

```bash
# 1. Build the gateway image
docker build -t invoicehive-nginx:local ./gateway

# 2. Run with environment variables
docker run -e SERVER_NAME="localhost api.test.local" \
           -e ALLOWED_ORIGIN_1="http://localhost:3000" \
           -e ALLOWED_ORIGIN_2="http://localhost" \
           -e ALLOWED_ORIGIN_3="https://test.local" \
           -p 80:80 \
           invoicehive-nginx:local

# 3. Verify config was generated
# Log output should show:
# ✓ Nginx config generated at /etc/nginx/conf.d/default.conf
# [notice] signal process started
```

---

## GitHub Secrets Setup

GitHub Actions will read these secrets to deploy safely. Add them in: **Repo Settings → Secrets and variables → Actions**

### Required Secrets

```
# ── EC2 Configuration ──
EC2_HOST              = your-ec2-public-ip-or-domain
EC2_USER              = ubuntu
EC2_SSH_KEY           = contents of your .pem private key

# ── Docker Registry ──
DOCKER_USERNAME       = your_dockerhub_username
DOCKER_PASSWORD       = your_dockerhub_personal_access_token

# ── Application Domains (different per environment) ──
API_DOMAIN            = api.yourdomain.com
APP_DOMAIN            = yourdomain.com

# ── Database & Cache ──
MONGO_URI             = mongodb+srv://user:pass@cluster...
REDIS_URL             = rediss://user:pass@redis-host:6379

# ── JWT Secrets (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" ) ──
JWT_ACCESS_SECRET     = (32+ char hex string)
JWT_REFRESH_SECRET    = (32+ char hex string)
COOKIE_SECRET         = (32+ char hex string)
INTERNAL_SECRET       = (32+ char hex string)

# ── OAuth ──
GOOGLE_CLIENT_ID      = your_google_client_id
GOOGLE_CLIENT_SECRET  = your_google_client_secret
GITHUB_CLIENT_ID      = your_github_client_id
GITHUB_CLIENT_SECRET  = your_github_client_secret

# ── Email (SMTP) ──
SMTP_HOST             = smtp.gmail.com
SMTP_PORT             = 587
SMTP_USER             = your_email@gmail.com
SMTP_PASS             = your_app_specific_password
EMAIL_FROM            = noreply@yourdomain.com

# ── AWS S3 ──
AWS_REGION            = us-east-1
AWS_ACCESS_KEY_ID     = AKIA...
AWS_SECRET_ACCESS_KEY = ...
AWS_S3_BUCKET         = your-bucket-name
STORAGE_PUBLIC_URL    = https://s3.amazonaws.com/your-bucket

# ── RabbitMQ ──
RABBITMQ_USER         = rabbitmq_user
RABBITMQ_PASS         = rabbitmq_password

# ── Payment Gateway (Razorpay) ──
RAZORPAY_KEY_ID       = rzp_live_...
RAZORPAY_KEY_SECRET   = ...
RAZORPAY_WEBHOOK_SECRET = ...
```

**Important:** Never commit `.env` to git. GitHub Secrets are encrypted and safe.

---

## EC2 Setup

### 1. Launch EC2 Instance

```bash
# From AWS Console:
# - AMI: Ubuntu Server 22.04 LTS
# - Instance type: t3.medium (or larger for production)
# - Storage: 30GB gp3
# - Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
# - Create/select key pair → download .pem file
```

### 2. SSH into EC2

```bash
# Make key readable only by you
chmod 600 /path/to/your-key.pem

# Connect
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip
```

### 3. Run Setup Script

```bash
# From your local machine, copy setup script
scp -i /path/to/your-key.pem setup-ec2.sh ubuntu@your-ec2-ip:~/setup-ec2.sh

# SSH into EC2 and run it
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# On EC2:
sudo bash ~/setup-ec2.sh

# Verify installations
docker --version
docker-compose --version
certbot --version
```

---

## SSL/TLS Certificate

### Get Certificate from Let's Encrypt

```bash
# SSH into EC2
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# Stop any existing services
cd ~/invoicehive
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Get certificate (standalone mode — requires port 80 available)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --agree-tos \
  --email your@email.com

# Verify certificate created
ls /etc/letsencrypt/live/yourdomain.com/
```

### Auto-Renew Certificate

```bash
# Enable certbot renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal timer
sudo systemctl status certbot.timer
```

---

## First Deployment

### Method 1: Git Push (Automatic via GitHub Actions)

```bash
# From your local machine
git push origin main

# GitHub Actions will:
# 1. Build Docker images for all services
# 2. Push to Docker Hub
# 3. SSH into EC2
# 4. Generate .env file with secrets
# 5. Pull latest images
# 6. Start services
```

### Method 2: Manual Deployment

```bash
# On EC2:
cd ~/invoicehive

# Create .env from GitHub Secrets (or manually)
cat > .env <<'EOF'
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
MONGO_URI=... (from secrets)
REDIS_URL=... (from secrets)
# ... etc
EOF

# Pull latest code
git pull origin main

# Pull latest Docker images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Verify Deployment

```bash
# Check health endpoints
curl -i http://localhost/health
curl -i http://localhost/health/auth
curl -i http://localhost/health/clients

# Check logs
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f auth-service
```

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f auth-service
docker-compose -f docker-compose.prod.yml logs -f nginx

# Follow last 50 lines
docker-compose -f docker-compose.prod.yml logs --tail=50 -f
```

### Check Service Health

```bash
# All services
docker-compose -f docker-compose.prod.yml ps

# Detailed health
curl -s http://localhost/health | jq .

# Per-service health
curl -s http://localhost/health/auth | jq .
curl -s http://localhost/health/clients | jq .
curl -s http://localhost/health/invoices | jq .
curl -s http://localhost/health/payments | jq .
```

### Monitor Resource Usage

```bash
# Docker stats (CPU, memory)
docker stats

# Disk space
df -h

# Database size
docker exec invoicehive_mongo_auth_1 mongosh admin --eval "db.stats()"
```

---

## Troubleshooting

### Issue: Services not starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart auth-service
```

### Issue: Nginx config error

```bash
# Check Nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Test config inside container
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Verify environment variables were substituted
docker-compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf
```

### Issue: Domain not resolving

```bash
# Verify DNS A record points to EC2 IP
nslookup yourdomain.com
dig yourdomain.com

# Check EC2 security group allows port 80/443
# AWS Console → Security Groups → Your SG → Inbound Rules
```

### Issue: SSL certificate expired

```bash
# Manual renewal
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates
```

### Issue: Database connection fails

```bash
# Check MongoDB/Redis containers are running
docker-compose -f docker-compose.prod.yml ps

# Check connection string in logs
docker-compose -f docker-compose.prod.yml logs mongo-auth | head -20

# Restart database
docker-compose -f docker-compose.prod.yml restart mongo-auth redis
```

---

## Zero-Downtime Deployments

The CI/CD is configured for zero-downtime rolling updates:

```bash
# When you push to main:
# 1. New Docker images are built
# 2. Services restart one at a time
# 3. Old images are cleaned up
# 4. Health checks verify everything is working
```

---

## Rollback

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# GitHub Actions will automatically deploy previous version
```

---

## Security Best Practices

1. ✅ Keep `.env` secrets **only** in GitHub Secrets, never in repo
2. ✅ Use strong secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. ✅ Rotate secrets every 90 days
4. ✅ Enable SSH key-based auth only (no password)
5. ✅ Use VPC security groups to restrict access
6. ✅ Enable CloudWatch monitoring/alerts
7. ✅ Backup databases regularly
8. ✅ Keep Docker images updated

---

## Quick Commands

```bash
# Deploy (on EC2)
cd ~/invoicehive && docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Clean up old images
docker image prune -a -f

# Check disk space
df -h

# Update code
git pull origin main
```

---

## Support

- **Logs:** `docker-compose -f docker-compose.prod.yml logs -f`
- **Health:** `curl http://localhost/health`
- **GitHub Actions:** Repo → Actions tab
- **EC2 Logs:** `/var/log/invoicehive/*.log`
