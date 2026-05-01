# ✅ InvoiceHive Deployment Checklist

Use this checklist to ensure everything is ready before deploying to production.

---

## 🔧 Pre-Deployment Setup

- [ ] **EC2 Instance Running**
  - [ ] Ubuntu 22.04 LTS
  - [ ] t3.medium or larger
  - [ ] 30GB storage
  - [ ] Security group allows ports 22, 80, 443

- [ ] **Domain Name Configured**
  - [ ] DNS A record points to EC2 IP
  - [ ] Use dig/nslookup to verify: `dig yourdomain.com`
  - [ ] Have both API and APP domains ready:
    - API_DOMAIN: `api.yourdomain.com`
    - APP_DOMAIN: `yourdomain.com`

- [ ] **GitHub Repository Setup**
  - [ ] Code pushed to main branch
  - [ ] .github/workflows/deploy.yml present
  - [ ] .env.example present (no secrets)
  - [ ] .gitignore includes .env files

- [ ] **Docker Hub Account**
  - [ ] Created Docker Hub account
  - [ ] Created personal access token (not password)
  - [ ] Repository naming: `yourusername/invoicehive-*`

---

## 🔐 GitHub Secrets Configuration

Add all these secrets in: **Repo Settings → Secrets and variables → Actions**

### EC2 Connection
- [ ] `EC2_HOST` = your EC2 public IP or domain
- [ ] `EC2_USER` = `ubuntu`
- [ ] `EC2_SSH_KEY` = contents of your .pem private key

### Docker Registry
- [ ] `DOCKER_USERNAME` = your Docker Hub username
- [ ] `DOCKER_PASSWORD` = your Docker Hub personal access token

### Application Domains
- [ ] `API_DOMAIN` = api.yourdomain.com
- [ ] `APP_DOMAIN` = yourdomain.com

### Database & Cache
- [ ] `MONGO_URI` = mongodb+srv://user:pass@cluster...
- [ ] `REDIS_URL` = rediss://user:pass@host:6379

### JWT & Authentication Secrets
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- [ ] `JWT_ACCESS_SECRET` = (32+ char hex string, changed from .env)
- [ ] `JWT_REFRESH_SECRET` = (32+ char hex string, changed from .env)
- [ ] `COOKIE_SECRET` = (32+ char hex string, changed from .env)
- [ ] `INTERNAL_SECRET` = (32+ char hex string, changed from .env)

### OAuth Configuration
- [ ] `GOOGLE_CLIENT_ID` = from Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` = from Google Cloud Console
- [ ] `GITHUB_CLIENT_ID` = from GitHub Developer Settings
- [ ] `GITHUB_CLIENT_SECRET` = from GitHub Developer Settings

### Email (SMTP)
- [ ] `SMTP_HOST` = smtp.gmail.com (or your provider)
- [ ] `SMTP_PORT` = 587
- [ ] `SMTP_USER` = your@email.com
- [ ] `SMTP_PASS` = app-specific password (not Gmail password)
- [ ] `EMAIL_FROM` = noreply@yourdomain.com

### AWS S3
- [ ] `AWS_REGION` = us-east-1
- [ ] `AWS_ACCESS_KEY_ID` = from IAM user
- [ ] `AWS_SECRET_ACCESS_KEY` = from IAM user
- [ ] `AWS_S3_BUCKET` = bucket-name
- [ ] `STORAGE_PUBLIC_URL` = https://s3.amazonaws.com/bucket-name

### RabbitMQ
- [ ] `RABBITMQ_USER` = strong username (not "guest")
- [ ] `RABBITMQ_PASS` = strong password (not "guest")

### Razorpay (Payment Gateway)
- [ ] `RAZORPAY_KEY_ID` = rzp_live_... (production key)
- [ ] `RAZORPAY_KEY_SECRET` = from Razorpay dashboard
- [ ] `RAZORPAY_WEBHOOK_SECRET` = from Razorpay webhook config

---

## 🚀 EC2 Initial Setup

SSH into EC2:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

- [ ] **Run Setup Script**
  ```bash
  scp -i your-key.pem setup-ec2.sh ubuntu@ec2-ip:~/
  ssh -i your-key.pem ubuntu@ec2-ip
  sudo bash ~/setup-ec2.sh
  ```

- [ ] **Verify Installations**
  ```bash
  docker --version          # Should be 24+
  docker-compose --version  # Should be 2.x+
  certbot --version         # Should be 2.x+
  ```

- [ ] **Get SSL Certificate**
  ```bash
  sudo certbot certonly --standalone \
    -d yourdomain.com \
    -d www.yourdomain.com \
    -d api.yourdomain.com \
    --agree-tos \
    --email your@email.com
  ```

- [ ] **Verify Certificate Created**
  ```bash
  ls /etc/letsencrypt/live/yourdomain.com/
  # Should show: privkey.pem, fullchain.pem, etc.
  ```

- [ ] **Clone Repository**
  ```bash
  cd ~ && git clone https://github.com/yourusername/invoicehive.git
  cd invoicehive
  ```

---

## 🧪 Local Testing Before Production

- [ ] **Build Locally**
  ```bash
  docker-compose build --no-cache
  ```

- [ ] **Run Locally**
  ```bash
  docker-compose up -d
  ```

- [ ] **Test Endpoints**
  ```bash
  curl http://localhost/health
  curl http://localhost/health/auth
  curl http://localhost/api/auth/health
  ```

- [ ] **Check Nginx Config Generated Correctly**
  ```bash
  docker-compose logs nginx | grep "nginx config generated"
  ```

- [ ] **Stop Local Services**
  ```bash
  docker-compose down
  ```

---

## 🚢 First Production Deployment

### Option A: Automatic (GitHub Actions)
- [ ] Commit all changes locally
- [ ] Push to main: `git push origin main`
- [ ] Watch GitHub Actions → Actions tab
- [ ] Verify deployment completes ✓

### Option B: Manual
- [ ] SSH into EC2
- [ ] Pull code: `git pull origin main`
- [ ] Pull images: `docker-compose -f docker-compose.prod.yml pull`
- [ ] Start services: `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Check status: `docker-compose -f docker-compose.prod.yml ps`

---

## ✅ Post-Deployment Verification

After deployment (whether automatic or manual):

- [ ] **Check All Services Running**
  ```bash
  docker-compose -f docker-compose.prod.yml ps
  # All should show "healthy" or "Up"
  ```

- [ ] **Test Health Endpoints**
  ```bash
  curl https://api.yourdomain.com/health
  curl https://api.yourdomain.com/health/auth
  curl https://api.yourdomain.com/health/clients
  curl https://api.yourdomain.com/health/invoices
  curl https://api.yourdomain.com/health/payments
  ```

- [ ] **Test Frontend Access**
  ```bash
  curl -I https://yourdomain.com
  # Should see: HTTP/1.1 200 OK
  ```

- [ ] **Check Logs for Errors**
  ```bash
  docker-compose -f docker-compose.prod.yml logs | grep -i error
  # Should see no critical errors
  ```

- [ ] **Verify Nginx Config Substitution**
  ```bash
  docker-compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf
  # Should show real domains, not ${VARIABLE} placeholders
  ```

- [ ] **Test CORS Headers**
  ```bash
  curl -I -H "Origin: https://yourdomain.com" https://api.yourdomain.com/health
  # Should see: Access-Control-Allow-Origin: https://yourdomain.com
  ```

- [ ] **Check SSL Certificate**
  ```bash
  curl -vI https://api.yourdomain.com
  # Should show valid certificate (not self-signed)
  ```

---

## 📊 Production Monitoring

Regularly verify (daily for first week, then weekly):

- [ ] **Service Health**
  ```bash
  curl https://api.yourdomain.com/health
  ```

- [ ] **Disk Space**
  ```bash
  df -h
  # Should have > 10GB free
  ```

- [ ] **Docker Resource Usage**
  ```bash
  docker stats
  # Monitor CPU and memory usage
  ```

- [ ] **Recent Logs**
  ```bash
  docker-compose -f docker-compose.prod.yml logs --tail=100 | grep -i "error\|warn"
  ```

- [ ] **Database Connectivity**
  ```bash
  docker-compose -f docker-compose.prod.yml exec mongo-auth \
    mongosh admin --eval "db.adminCommand('ping')"
  # Should see: { ok: 1 }
  ```

- [ ] **Redis Connectivity**
  ```bash
  docker-compose -f docker-compose.prod.yml exec redis \
    redis-cli ping
  # Should see: PONG
  ```

---

## 🔄 SSL Certificate Renewal

Let's Encrypt certificates expire after 90 days. Auto-renewal should be running, but verify:

- [ ] **Check Renewal Timer Status**
  ```bash
  sudo systemctl status certbot.timer
  # Should be "active (waiting)"
  ```

- [ ] **Manual Renewal Test**
  ```bash
  sudo certbot renew --dry-run
  # Should show "Cert not yet due for renewal"
  ```

- [ ] **Check Certificate Expiry**
  ```bash
  sudo certbot certificates
  # Should show > 30 days remaining
  ```

---

## 🚨 Emergency Procedures

### If Nginx Won't Start
```bash
docker-compose -f docker-compose.prod.yml logs nginx
# Check for config errors
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
# Restart: docker-compose -f docker-compose.prod.yml restart nginx
```

### If Services Crash
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Or specific service
docker-compose -f docker-compose.prod.yml restart auth-service
```

### If Database is Corrupted
```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Remove database volume
docker volume rm invoicehive_mongo_auth_data

# Restart (creates fresh database)
docker-compose -f docker-compose.prod.yml up -d
```

### If Need to Rollback
```bash
git revert HEAD
git push origin main
# GitHub Actions will deploy previous version
```

---

## 📝 Documentation Files

Keep these for reference:

- [ ] **DEPLOYMENT.md** — Full deployment guide
- [ ] **PRODUCTION_READY.md** — This file
- [ ] **.env.example** — All variables explained
- [ ] **setup-ec2.sh** — EC2 setup script
- [ ] **README.md** — Project overview

---

## ✨ Production Deployment Complete!

Once all checkboxes are marked, your InvoiceHive is ready for production! 🎉

For ongoing operations:
- Monitor logs daily
- Renew SSL certificates every 90 days
- Backup databases regularly
- Rotate secrets every 90 days
- Keep Docker images updated

**Questions?** Check DEPLOYMENT.md or GitHub Issues.
