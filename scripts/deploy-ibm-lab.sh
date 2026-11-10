#!/usr/bin/env bash
set -euo pipefail
cd /home/project
repo=https://github.com/Mikosh001/backend-nodejs-capstone.git
if [[ ! -d secondchance-capstone-work/.git ]]; then
  git clone --depth 1 "$repo" secondchance-capstone-work
fi
cd secondchance-capstone-work
git rev-parse --short HEAD
namespace=$(ibmcloud cr namespaces | awk '/^sn-labs-/ {print $1; exit}')
test -n "$namespace"
registry="us.icr.io/$namespace"
api="$registry/secondchance-capstone-api:latest"
web="$registry/secondchance-capstone-web:latest"
docker build --tag "$api" secondChance-backend
docker push "$api"
if ! kubectl get secret secondchance-capstone-runtime >/dev/null 2>&1; then
  db_password=$(openssl rand -hex 24)
  kubectl create secret generic secondchance-capstone-runtime \
    --from-literal=MONGO_INITDB_ROOT_USERNAME=secondchance \
    --from-literal=MONGO_INITDB_ROOT_PASSWORD="$db_password" \
    --from-literal=MONGO_URL="mongodb://secondchance:$db_password@secondchance-capstone-mongo:27017/secondChance?authSource=admin" \
    --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
fi
cat <<YAML | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: secondchance-capstone-mongo
spec:
  selector:
    app: secondchance-capstone-mongo
  ports:
    - port: 27017
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secondchance-capstone-mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secondchance-capstone-mongo
  template:
    metadata:
      labels:
        app: secondchance-capstone-mongo
    spec:
      securityContext:
        fsGroup: 999
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: secondchance-capstone-runtime
                  key: MONGO_INITDB_ROOT_USERNAME
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: secondchance-capstone-runtime
                  key: MONGO_INITDB_ROOT_PASSWORD
          readinessProbe:
            tcpSocket:
              port: 27017
            periodSeconds: 5
            timeoutSeconds: 3
          volumeMounts:
            - name: datadir
              mountPath: /data/db
          securityContext:
            runAsUser: 999
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
      volumes:
        - name: datadir
          emptyDir: {}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secondchance-capstone-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secondchance-capstone-api
  template:
    metadata:
      labels:
        app: secondchance-capstone-api
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      imagePullSecrets:
        - name: icr
      containers:
        - name: api
          image: $api
          imagePullPolicy: Always
          ports:
            - containerPort: 3060
          env:
            - name: MONGO_URL
              valueFrom:
                secretKeyRef:
                  name: secondchance-capstone-runtime
                  key: MONGO_URL
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: secondchance-capstone-runtime
                  key: JWT_SECRET
          readinessProbe:
            httpGet:
              path: /health
              port: 3060
            periodSeconds: 5
            timeoutSeconds: 3
          securityContext:
            runAsUser: 1000
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
YAML
kubectl rollout status deployment/secondchance-capstone-mongo --timeout=140s
kubectl rollout status deployment/secondchance-capstone-api --timeout=140s
kubectl exec deployment/secondchance-capstone-api -- node util/import-mongo/index.js
kubectl get deployments secondchance-capstone-mongo secondchance-capstone-api
if ! curl -fsS http://127.0.0.1:3060/health >/dev/null 2>&1; then
  nohup kubectl port-forward deployment/secondchance-capstone-api 3060:3060 </dev/null >/home/project/secondchance-port-forward.log 2>&1 &
fi
printf 'SECONDCHANCE_BACKEND_READY\n'
docker build --tag "$web" --file secondChanceWebsite/Dockerfile .
docker push "$web"
printf 'SECONDCHANCE_IMAGES_READY\n'
