# BHU Clearance System - Deployment Architecture Guide

## Overview

This document provides a comprehensive deployment architecture for the BHU Student Clearance Management System, covering development, staging, and production environments with scalability, security, and reliability considerations.

## 1. **System Architecture**

### 1.1 **High-Level Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (SSL)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐         ┌───▼───┐         ┌───▼───┐
│ Front │         │ Front │         │ Front │
│ End 1 │         │ End 2 │         │ End N │
└───┬───┘         └───┬───┘         └───┬───┘
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
              ┌───────▼───────┐
              │   API Gateway │
              └───────┬───────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐         ┌───▼───┐         ┌───▼───┐
│Backend│         │Backend│         │Backend│
│   1   │         │   2   │         │   N   │
└───┬───┘         └───┬───┘         └───┬───┘
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
        ┌─────────────▼─────────────┐
        │     Database Cluster      │
        │    (Primary + Replica)    │
        └───────────────────────────┘
```

### 1.2 **Component Breakdown**

#### **Frontend Layer**
- **Technology**: React + TypeScript + Vite
- **Deployment**: Static files on CDN/Storage
- **Scaling**: Horizontal scaling via CDN
- **Performance**: Lazy loading, code splitting, caching

#### **Backend Layer**
- **Technology**: NestJS + TypeScript + Node.js
- **Deployment**: Docker containers on Kubernetes
- **Scaling**: Horizontal auto-scaling
- **Performance**: Connection pooling, caching

#### **Database Layer**
- **Technology**: PostgreSQL 15+
- **Deployment**: Managed database service
- **Scaling**: Read replicas, connection pooling
- **Performance**: Indexing, query optimization

## 2. **Environment Configuration**

### 2.1 **Development Environment**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3001

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/bhu_dev
      - JWT_SECRET=dev-secret
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=bhu_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 2.2 **Staging Environment**
```yaml
# k8s/staging/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bhu-clearance-backend
  namespace: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bhu-clearance-backend
  template:
    metadata:
      labels:
        app: bhu-clearance-backend
    spec:
      containers:
      - name: backend
        image: bhu-clearance/backend:staging-latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "staging"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bhu-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: bhu-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2.3 **Production Environment**
```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bhu-clearance-backend
  namespace: production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: bhu-clearance-backend
  template:
    metadata:
      labels:
        app: bhu-clearance-backend
        version: v1.0.0
    spec:
      containers:
      - name: backend
        image: bhu-clearance/backend:prod-v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bhu-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bhu-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: bhu-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        persistentVolumeClaim:
          claimName: bhu-logs-pvc
```

## 3. **Infrastructure Components**

### 3.1 **Kubernetes Cluster Configuration**
```yaml
# k8s/cluster-config.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bhu-clearance-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - clearance.bhu.edu.et
    secretName: bhu-clearance-tls
  rules:
  - host: clearance.bhu.edu.et
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: bhu-clearance-backend-service
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bhu-clearance-frontend-service
            port:
              number: 80
```

### 3.2 **Database Configuration**
```yaml
# PostgreSQL Production Configuration
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: bhu-clearance-db
  namespace: production
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised
  
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      maintenance_work_mem: "64MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      
  bootstrap:
    initdb:
      database: bhu_clearance
      owner: bhu_user
      secret:
        name: postgres-credentials
        
  storage:
    size: 100Gi
    storageClass: fast-ssd
    
  monitoring:
    enabled: true
    
  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: "s3://bhu-clearance-backups/postgres"
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
```

### 3.3 **Redis Configuration**
```yaml
# Redis for caching and sessions
apiVersion: v1
kind: Deployment
metadata:
  name: redis
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --maxmemory
        - "400mb"
        - --maxmemory-policy
        - "allkeys-lru"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

## 4. **CI/CD Pipeline**

### 4.1 **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
      - name: Run tests
        run: |
          cd backend && npm run test:coverage
          cd ../frontend && npm run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    strategy:
      matrix:
        component: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.component }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}
      - name: Deploy to staging
        run: |
          kubectl set image deployment/bhu-clearance-backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:develop-${{ github.sha }} -n staging
          kubectl rollout status deployment/bhu-clearance-backend -n staging

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
      - name: Deploy to production
        run: |
          kubectl set image deployment/bhu-clearance-backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:main-${{ github.sha }} -n production
          kubectl rollout status deployment/bhu-clearance-backend -n production
      - name: Run smoke tests
        run: |
          chmod +x scripts/smoke-tests.sh
          ./scripts/smoke-tests.sh https://clearance.bhu.edu.et
```

### 4.2 **Docker Configuration**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/main.js"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 5. **Monitoring and Observability**

### 5.1 **Prometheus Configuration**
```yaml
# monitoring/prometheus.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "bhu_clearance_rules.yml"
    
    scrape_configs:
      - job_name: 'bhu-clearance-backend'
        static_configs:
          - targets: ['bhu-clearance-backend-service.production.svc.cluster.local:3000']
        metrics_path: '/metrics'
        scrape_interval: 10s
      
      - job_name: 'postgres'
        static_configs:
          - targets: ['postgres-exporter.production.svc.cluster.local:9187']
      
      - job_name: 'redis'
        static_configs:
          - targets: ['redis-exporter.production.svc.cluster.local:9121']
```

### 5.2 **Grafana Dashboards**
```json
{
  "dashboard": {
    "title": "BHU Clearance System Overview",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Clearance Requests by Status",
        "type": "piechart",
        "targets": [
          {
            "expr": "clearance_requests_by_status",
            "legendFormat": "{{status}}"
          }
        ]
      }
    ]
  }
}
```

### 5.3 **Alerting Rules**
```yaml
# monitoring/bhu_clearance_rules.yml
groups:
  - name: bhu_clearance_alerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API response time detected"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod is crash looping"
          description: "Pod {{ $labels.pod }} is restarting frequently"
```

## 6. **Security Configuration**

### 6.1 **Network Policies**
```yaml
# k8s/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bhu-clearance-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: bhu-clearance-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: bhu-clearance-frontend
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### 6.2 **Pod Security Policy**
```yaml
# k8s/security/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: bhu-clearance-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 7. **Backup and Disaster Recovery**

### 7.1 **Database Backup Strategy**
```yaml
# k8s/backup/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="bhu-clearance-$(date +%Y%m%d_%H%M%S).sql"
              pg_dump $DATABASE_URL > /backup/$BACKUP_FILE
              aws s3 cp /backup/$BACKUP_FILE s3://bhu-clearance-backups/postgres/
              find /backup -name "*.sql" -mtime +7 -delete
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: DATABASE_URL
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: ACCESS_KEY_ID
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: SECRET_ACCESS_KEY
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### 7.2 **Disaster Recovery Plan**
```markdown
## Disaster Recovery Procedures

### 1. Database Recovery
1. Identify last good backup from S3
2. Restore to new database instance
3. Update application configuration
4. Verify data integrity
5. Switch traffic to recovered instance

### 2. Application Recovery
1. Deploy to fresh Kubernetes cluster
2. Restore configurations from Git
3. Update DNS to point to new cluster
4. Run smoke tests
5. Monitor performance

### 3. RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Backup Frequency**: Every 6 hours
- **Retention Period**: 30 days
```

## 8. **Scaling Strategy**

### 8.1 **Horizontal Pod Autoscaler**
```yaml
# k8s/scaling/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bhu-clearance-backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bhu-clearance-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 8.2 **Cluster Autoscaler**
```yaml
# k8s/scaling/cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        resources:
          limits:
            cpu: 100m
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 300Mi
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/bhu-clearance
```

## 9. **Performance Optimization**

### 9.1 **Application Performance**
```typescript
// Performance monitoring middleware
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private logger = new Logger('Performance');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log slow requests
      if (duration > 1000) {
        this.logger.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
      }
      
      // Record metrics
      this.recordMetrics(req, res, duration);
    });
    
    next();
  }

  private recordMetrics(req: Request, res: Response, duration: number) {
    // Send metrics to Prometheus
    // httpRequestDuration.observe(duration, { method: req.method, route: req.route?.path });
    // httpRequestTotal.inc({ method: req.method, status: res.statusCode.toString() });
  }
}
```

### 9.2 **Database Performance**
```sql
-- Performance monitoring queries
-- 1. Slow query analysis
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Index usage analysis
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 3. Table size analysis
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 10. **Environment-Specific Configurations**

### 10.1 **Configuration Management**
```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  },
  redis: {
    url: process.env.REDIS_URL,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  aws: {
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT, 10) || 9090,
  },
  features: {
    emailNotifications: process.env.EMAIL_NOTIFICATIONS === 'true',
    smsNotifications: process.env.SMS_NOTIFICATIONS === 'true',
    twoFactorAuth: process.env.TWO_FACTOR_AUTH === 'true',
  },
});
```

## 11. **Deployment Checklist**

### 11.1 **Pre-Deployment Checklist**
```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage meets requirements (>85%)
- [ ] No security vulnerabilities in dependencies
- [ ] Code reviewed and approved
- [ ] Documentation updated

### Performance
- [ ] Load tests completed successfully
- [ ] Database queries optimized
- [ ] Memory usage within limits
- [ ] Response times acceptable (<500ms p95)

### Security
- [ ] Security tests passing
- [ ] Secrets properly configured
- [ ] SSL certificates valid
- [ ] Access controls verified

### Infrastructure
- [ ] Monitoring configured
- [ ] Backup strategy tested
- [ ] Scaling policies verified
- [ ] Network policies applied
```

### 11.2 **Post-Deployment Checklist**
```markdown
## Post-Deployment Checklist

### Health Checks
- [ ] Application responding to health checks
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] External services accessible

### Monitoring
- [ ] Metrics being collected
- [ ] Alerts configured and working
- [ ] Dashboards displaying data
- [ ] Log aggregation working

### Functional Testing
- [ ] User login working
- [ ] Clearance workflow functional
- [ ] Email notifications working
- [ ] File uploads working

### Performance
- [ ] Response times within SLA
- [ ] Error rates acceptable
- [ ] Resource utilization normal
- [ ] Auto-scaling working
```

This comprehensive deployment architecture ensures the BHU Clearance System can be deployed reliably, scaled efficiently, and maintained effectively in a production environment.
