# BHU Clearance System - Deployment Guide

## 🚀 Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 3000, 3001, and 5432 available

### Development Setup

```bash
# Clone and navigate to project
git clone <repository-url>
cd "BHU Clearance System"

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Public Verification**: http://localhost:3000/verify

## 📋 Service Details

### Services Included

1. **PostgreSQL Database** (Port 5432)
   - Official PostgreSQL 16 Alpine image
   - Persistent data storage
   - Health checks enabled

2. **Backend API** (Port 3000)
   - Node.js 18 Alpine
   - Production-optimized build
   - Health checks every 30s
   - Auto-restart on failure

3. **Frontend Dev Server** (Port 3001)
   - Hot reload enabled
   - Development mode
   - Volume mounted for live editing

### Health Checks

- **Database**: `pg_isready` command
- **Backend**: HTTP health endpoint
- **Automatic**: Service dependencies enforced

## 🔧 Configuration

### Environment Variables

```bash
# Backend Configuration
NODE_ENV=production
DATABASE_URL=postgresql://bhu:bhu@postgres:5432/bhu_clearance
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EMAIL_ENABLED=false
FRONTEND_URL=http://localhost:3001

# Frontend Configuration
VITE_API_URL=http://localhost:3000
```

### Database Setup

The system automatically:

- Creates the database on first run
- Runs Prisma migrations
- Sets up proper tables and indexes

## 🏥 Health Monitoring

### Health Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Readiness check (for Kubernetes)
curl http://localhost:3000/health/ready

# Database status
curl http://localhost:3000/health | jq '.database'
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-03-25T16:59:00.000Z",
  "uptime": 3600.5,
  "database": {
    "status": "connected",
    "responseTime": "15ms"
  },
  "version": "1.0.0",
  "environment": "production"
}
```

## 🐳 Docker Commands

### Development

```bash
# Start all services
docker-compose up -d

# Rebuild backend
docker-compose up -d --build backend

# View logs
docker-compose logs -f backend

# Access backend shell
docker-compose exec backend sh

# Access database
docker-compose exec postgres psql -U bhu -d bhu_clearance
```

### Production

```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# Scale backend
docker-compose up -d --scale backend=3

# Update without downtime
docker-compose up -d --no-deps backend
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default database passwords
- [ ] Set strong JWT secret
- [ ] Configure email provider
- [ ] Enable HTTPS/TLS
- [ ] Set up proper CORS
- [ ] Configure backup strategy
- [ ] Monitor logs and metrics

### Security Headers

The application includes:

- CORS protection
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection

## 📊 Monitoring

### Logs

```bash
# Application logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

### Metrics Available

- Response times
- Database performance
- Error rates
- User activity
- Clearance completion rates

## 🚀 Production Deployment

### Option 1: Docker Compose (Simple)

```bash
# Production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=bhu-clearance
```

### Option 3: Cloud Services

- **AWS**: ECS/RDS + ALB
- **Google Cloud**: GKE + Cloud SQL
- **Azure**: AKS + Azure Database
- **DigitalOcean**: App Platform + Managed DB

## 🔄 Backup Strategy

### Database Backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U bhu bhu_clearance > backup.sql

# Automated backup (add to crontab)
0 2 * * * docker-compose exec postgres pg_dump -U bhu bhu_clearance > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Data Persistence

- Database data persisted in Docker volume
- File uploads persisted in mounted volume
- Configuration in environment variables

## 🛠️ Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml
2. **Database connection**: Check PostgreSQL health status
3. **Build failures**: Clear Docker cache: `docker system prune`
4. **Memory issues**: Increase Docker memory allocation

### Debug Commands

```bash
# Check service status
docker-compose ps

# Inspect service
docker-compose inspect backend

# Access container shell
docker-compose exec backend sh

# Restart service
docker-compose restart backend
```

## 📚 Additional Resources

### Documentation

- [API Documentation](http://localhost:3000/api/docs)
- Database schema is managed via Prisma (`backend/prisma/schema.prisma`) and migrations (`backend/prisma/migrations`).
- [Architecture Guide](./docs/architecture.md)

### Support

- Check logs for error messages
- Verify environment variables
- Ensure all services are healthy
- Check network connectivity

---

**🎉 Your BHU Clearance System is now ready for deployment!**
