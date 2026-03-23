#!/bin/bash
# Run on VPS to deploy/update the app
set -e

echo "Pulling latest code..."
git -C /home/ec2-user/proffy pull

echo "Building and restarting..."
cd /home/ec2-user/proffy/vps
docker-compose pull
docker-compose up -d --build web

echo "Done. App is live."
docker-compose ps
