# JewGo Deployment on Google Kubernetes Engine (GKE)

## 🚀 Why GKE is Great for JewGo

### ✅ **Advantages:**
- **Auto-scaling**: Automatically scales based on traffic
- **Load balancing**: Built-in Google Cloud Load Balancer
- **Managed services**: Google manages the Kubernetes cluster
- **SSL certificates**: Automatic SSL with Google-managed certificates
- **Monitoring**: Integrated with Google Cloud Monitoring
- **Backup**: Persistent volumes with automatic backups
- **High availability**: Multi-zone deployment
- **Cost effective**: Pay only for what you use

### 🎯 **Perfect for JewGo because:**
- Restaurant data can scale with demand
- Multiple API instances for high availability
- Easy to add new features and services
- Built-in monitoring and logging
- Automatic SSL for api.jewgo.app

## 📋 GKE Deployment Plan

### **Architecture:**
```
Internet → Google Cloud Load Balancer → GKE Cluster
                                        ├── JewGo Backend (Flask)
                                        ├── JewGo Frontend (Next.js)
                                        ├── PostgreSQL (Cloud SQL)
                                        ├── Redis (Memorystore)
                                        └── Monitoring Stack
```

## 🔧 Step-by-Step GKE Setup

### **Step 1: Prerequisites**
```bash
# Install Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# Install kubectl
gcloud components install kubectl

# Install Docker (if not already installed)
```

### **Step 2: Create GKE Cluster**
```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Create cluster
gcloud container clusters create jewgo-cluster \
    --zone=us-central1-a \
    --num-nodes=3 \
    --machine-type=e2-medium \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=10 \
    --enable-autorepair \
    --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials jewgo-cluster --zone=us-central1-a
```

### **Step 3: Create Kubernetes Manifests**

#### **Backend Deployment (Flask)**
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jewgo-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jewgo-backend
  template:
    metadata:
      labels:
        app: jewgo-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/YOUR_PROJECT_ID/jewgo-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: jewgo-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: jewgo-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: jewgo-backend-service
spec:
  selector:
    app: jewgo-backend
  ports:
  - port: 80
    targetPort: 5000
  type: ClusterIP
```

#### **Frontend Deployment (Next.js)**
```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jewgo-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jewgo-frontend
  template:
    metadata:
      labels:
        app: jewgo-frontend
    spec:
      containers:
      - name: frontend
        image: gcr.io/YOUR_PROJECT_ID/jewgo-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_BACKEND_URL
          value: "https://api.jewgo.app"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: jewgo-frontend-service
spec:
  selector:
    app: jewgo-frontend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### **Ingress with SSL**
```yaml
# ingress.yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: jewgo-ssl-cert
spec:
  domains:
    - api.jewgo.app
    - jewgo.app
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jewgo-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "jewgo-ip"
    networking.gke.io/managed-certificates: "jewgo-ssl-cert"
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: api.jewgo.app
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: jewgo-backend-service
            port:
              number: 80
  - host: jewgo.app
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: jewgo-frontend-service
            port:
              number: 80
```

### **Step 4: Database Setup (Cloud SQL)**
```bash
# Create Cloud SQL instance
gcloud sql instances create jewgo-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create jewgo_db --instance=jewgo-db

# Create user
gcloud sql users create jewgo_user --instance=jewgo-db --password=jewgo_password_2024
```

### **Step 5: Redis Setup (Memorystore)**
```bash
# Create Redis instance
gcloud redis instances create jewgo-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x
```

### **Step 6: Build and Push Docker Images**
```bash
# Build backend image
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/jewgo-backend:latest .
docker push gcr.io/YOUR_PROJECT_ID/jewgo-backend:latest

# Build frontend image
cd ../frontend
docker build -t gcr.io/YOUR_PROJECT_ID/jewgo-frontend:latest .
docker push gcr.io/YOUR_PROJECT_ID/jewgo-frontend:latest
```

### **Step 7: Deploy to GKE**
```bash
# Create secrets
kubectl create secret generic jewgo-secrets \
    --from-literal=database-url="postgresql://jewgo_user:jewgo_password_2024@/jewgo_db?host=/cloudsql/YOUR_PROJECT_ID:us-central1:jewgo-db" \
    --from-literal=redis-url="redis://jewgo-redis:6379"

# Deploy applications
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml

# Check status
kubectl get pods
kubectl get services
kubectl get ingress
```

## 💰 **Cost Estimation**

### **GKE Cluster:**
- 3 nodes × e2-medium (2 vCPU, 4GB RAM) = ~$150/month
- Auto-scaling reduces costs during low traffic

### **Cloud SQL:**
- db-f1-micro (1 vCPU, 0.6GB RAM) = ~$25/month

### **Memorystore Redis:**
- 1GB Redis instance = ~$30/month

### **Load Balancer:**
- Global HTTP(S) Load Balancer = ~$20/month

### **Total: ~$225/month** (scales with usage)

## 🚀 **Migration from Current Setup**

### **Data Migration:**
1. Export data from current server
2. Import to Cloud SQL
3. Update DNS to point to GKE

### **Benefits:**
- **Zero downtime** migration possible
- **Automatic scaling** during traffic spikes
- **Built-in monitoring** and alerting
- **Automatic SSL** certificate management
- **High availability** across multiple zones

## 🎯 **Next Steps**

1. **Create Google Cloud Project**
2. **Enable required APIs** (GKE, Cloud SQL, Memorystore)
3. **Set up billing** and quotas
4. **Create GKE cluster**
5. **Deploy JewGo application**
6. **Configure DNS** to point to GKE
7. **Test and monitor**

## 🔧 **Quick Start Commands**

```bash
# 1. Create cluster
gcloud container clusters create jewgo-cluster --zone=us-central1-a --num-nodes=3

# 2. Get credentials
gcloud container clusters get-credentials jewgo-cluster --zone=us-central1-a

# 3. Deploy (after creating manifests)
kubectl apply -f k8s/

# 4. Check status
kubectl get all
```

**Would you like me to help you set up GKE for JewGo?** It's a great choice for scalability and reliability! 🚀
