#!/bin/bash
set -e

echo "Starting deployment..."
cd /home/ubuntu

echo "Pulling latest changes..."
git pull origin main

echo "Stopping containers..."
docker-compose down

echo "Building containers..."
docker-compose build --no-cache

echo "Starting containers..."
docker-compose up -d

echo "Waiting for services..."
sleep 30

echo "Health check..."
curl -f -s https://api.jewgo.app/health && echo " - API OK" || echo " - API FAILED"

echo "Deployment completed!"
