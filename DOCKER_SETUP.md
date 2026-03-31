# 🐳 Docker Setup Guide for InvoiceHive

## Step 1: Install Docker

### For Windows:
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer (Docker Desktop Installer.exe)
4. Follow the installation wizard
5. Restart your computer
6. Launch Docker Desktop from Start menu
7. Wait for Docker to start (whale icon in system tray)

### For Mac:
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Mac" (choose Intel or Apple Silicon)
3. Open the .dmg file
4. Drag Docker to Applications folder
5. Launch Docker from Applications
6. Grant permissions when asked
7. Wait for Docker to start (whale icon in menu bar)

### For Linux (Ubuntu/Debian):
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

---

## Step 2: Verify Docker Installation

Open terminal/command prompt and run:
```bash
docker --version
# Should show: Docker version 24.x.x or higher

docker-compose --version
# Should show: Docker Compose version v2.x.x or higher
```

---

## Step 3: Set Up Environment Variables

Navigate to your project directory:
```bash
cd /home/mutant/client
```

Create a `.env` file with all required secrets:
```bash
# Copy the example file (we'll create this next)
cp .env.example .env

# Edit with your values
nano .env  # or use any text editor
```

---

## Step 4: Start Docker Services

### For Development (with hot reload):
```bash
# Start all services
docker-compose up

# Or run in background (detached mode)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### For Production:
```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Step 5: Access Your Application

Once all services are running:

- **Frontend**: http://localhost
- **API Gateway**: http://localhost/api
- **RabbitMQ Management**: http://localhost:15672 (user: guest, pass: guest)
- **MinIO Console**: http://localhost:9001 (user: minioadmin, pass: minioadmin)

---

## Common Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Stop all services
docker-compose down

# Rebuild images (after code changes)
docker-compose build

# Restart a specific service
docker-compose restart frontend

# View logs for specific service
docker-compose logs -f auth-service

# Access container shell
docker exec -it invoicehive-frontend sh

# Clean up everything (containers, volumes, images)
docker-compose down -v --rmi all

# Check disk usage
docker system df

# Clean unused data
docker system prune -a
```

---

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"
**Solution**: Make sure Docker Desktop is running

### Issue: "Port already in use"
**Solution**: 
```bash
# Check what's using the port
sudo lsof -i :80  # or :3000, :5432, etc.

# Kill the process or change port in docker-compose.yml
```

### Issue: "permission denied"
**Solution** (Linux only):
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: Services crash on startup
**Solution**: 
```bash
# Check logs
docker-compose logs

# Verify .env file has all variables
# Check MongoDB/Redis/RabbitMQ are healthy
docker-compose ps
```

---

## Next Steps After Docker is Running

1. ✅ Verify all services are healthy: `docker-compose ps`
2. ✅ Check logs for errors: `docker-compose logs`
3. ✅ Access frontend at http://localhost
4. ✅ Test API endpoints at http://localhost/api
5. ✅ Register a new user account
6. ✅ Create your first invoice!

---

## Useful Tips

- **First startup takes 5-10 minutes** (downloading images, building)
- **Subsequent startups are much faster** (~30 seconds)
- Use `docker-compose up -d` to run in background
- Always run `docker-compose down` before shutting down computer
- Check `docker-compose logs` if something doesn't work
- Keep Docker Desktop running while developing

---

Need help? Check:
- Docker Docs: https://docs.docker.com/
- Docker Compose Docs: https://docs.docker.com/compose/
- Project README: ./README.md
