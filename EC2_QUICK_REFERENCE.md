# 🚀 InvoiceHive EC2 Deployment — Quick Reference

## Your Configuration

```
EC2_HOST          = 32.192.92.236
EC2_USER          = ubuntu
EC2_SSH_KEY       = invoiceHive.pem
API_DOMAIN        = api.ikshant.me
APP_DOMAIN        = ikshant.me
DOCKER_USERNAME   = (your Docker Hub username)
```

---

## Step 1: Verify EC2 Setup ✓ (Running now)

The setup script is installing:
- ✓ Docker 24+
- ✓ Docker Compose 2.x
- ✓ Certbot (SSL certificates)
- ✓ UFW firewall
- ✓ Application directory

Expected to complete in 3-5 minutes.

---

## Step 2: Get SSL Certificate (After setup completes)

```bash
ssh -i invoiceHive.pem ubuntu@32.192.92.236

# Get certificate for both domains
sudo certbot certonly --standalone \
  -d ikshant.me \
  -d www.ikshant.me \
  -d api.ikshant.me \
  --agree-tos \
  --email your@email.com

# Verify
sudo ls -la /etc/letsencrypt/live/ikshant.me/
```

---

## Step 3: GitHub Secrets Setup

**Location:** GitHub repo → Settings → Secrets and variables → Actions

**Must add all 25 secrets** (see DEPLOYMENT_CHECKLIST.md):

| Secret | Value | Source |
|--------|-------|--------|
| EC2_HOST | 32.192.92.236 | Your IP |
| EC2_USER | ubuntu | Default |
| EC2_SSH_KEY | (pem file contents) | invoiceHive.pem |
| DOCKER_USERNAME | your_username | Docker Hub |
| DOCKER_PASSWORD | your_token | Docker Hub PAT |
| API_DOMAIN | api.ikshant.me | ✓ Configured |
| APP_DOMAIN | ikshant.me | ✓ Configured |
| MONGO_URI | mongodb+srv://... | From MongoDB Atlas |
| REDIS_URL | rediss://... | From Upstash/Redis |
| JWT_ACCESS_SECRET | (32+ char hex) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| JWT_REFRESH_SECRET | (32+ char hex) | Generate new |
| COOKIE_SECRET | (32+ char hex) | Generate new |
| INTERNAL_SECRET | (32+ char hex) | Generate new |
| GOOGLE_CLIENT_ID | from Google Cloud | OAuth apps |
| GOOGLE_CLIENT_SECRET | from Google Cloud | OAuth apps |
| GITHUB_CLIENT_ID | from GitHub | Developer settings |
| GITHUB_CLIENT_SECRET | from GitHub | Developer settings |
| SMTP_HOST | smtp.gmail.com | Gmail SMTP |
| SMTP_PORT | 587 | Gmail SMTP |
| SMTP_USER | your@email.com | Gmail account |
| SMTP_PASS | app_password | Gmail app password |
| EMAIL_FROM | noreply@ikshant.me | Your email |
| AWS_REGION | us-east-1 | S3 region |
| AWS_ACCESS_KEY_ID | from AWS IAM | AWS credentials |
| AWS_SECRET_ACCESS_KEY | from AWS IAM | AWS credentials |
| AWS_S3_BUCKET | bucket-name | S3 bucket |
| STORAGE_PUBLIC_URL | https://s3.amazonaws.com/bucket | S3 public URL |
| RABBITMQ_USER | your_user | RabbitMQ |
| RABBITMQ_PASS | your_pass | RabbitMQ |
| RAZORPAY_KEY_ID | rzp_live_xxx | Razorpay |
| RAZORPAY_KEY_SECRET | xxx | Razorpay |
| RAZORPAY_WEBHOOK_SECRET | xxx | Razorpay |

---

## Step 4: Deploy via GitHub Actions

```bash
# From local machine
cd ~/Downloads/"untitled folder"/invoiceHive

git add .
git commit -m "prod: deploy to 32.192.92.236 with api.ikshant.me"
git push origin main

# Watch deployment:
# GitHub → Actions tab → Latest workflow run
```

---

## Step 5: Verify Deployment

```bash
# After GitHub Actions completes (~2 minutes)

curl https://api.ikshant.me/health
# Should return: {"status":"ok","gateway":"nginx"}

curl https://api.ikshant.me/health/auth
curl https://api.ikshant.me/health/clients
curl https://api.ikshant.me/health/invoices
curl https://api.ikshant.me/health/payments
```

---

## Helpful Commands

```bash
# SSH into EC2
ssh -i invoiceHive.pem ubuntu@32.192.92.236

# Check services running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Check disk space
df -h

# Check Docker stats
docker stats
```

---

## Timeline

- **Now:** EC2 setup script running (3-5 min)
- **After setup:** Get SSL certificate (1 min)
- **Then:** Add GitHub Secrets (5 min)
- **Then:** Push to GitHub (auto deploys, 2 min)
- **Total:** ~15 minutes to full production deployment

---

## Next: Check Setup Status

Waiting for EC2 setup script to complete...
