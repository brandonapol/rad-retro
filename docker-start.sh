#!/bin/bash
# Helper script to build and start the Retro Board Docker container

set -e

echo "🎨 Building Retro Board Docker image..."
docker-compose build

echo "🚀 Starting Retro Board..."
docker-compose up -d

echo ""
echo "✅ Retro Board is starting!"
echo ""
echo "📍 Application will be available at: http://localhost:8000"
echo "📚 API documentation at: http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop:          docker-compose down"
echo "  Rebuild:       docker-compose up -d --build"
echo ""
echo "⏳ Waiting for service to be healthy..."

# Wait for health check
for i in {1..30}; do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo ""
    echo "✨ Retro Board is ready! Visit http://localhost:8000"
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo ""
echo "⚠️  Service didn't become healthy in time. Check logs with: docker-compose logs -f"
exit 1
