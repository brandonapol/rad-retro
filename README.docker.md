# Retro Board - Docker Deployment

## Quick Start (Single Container)

### Build and run with docker-compose (recommended):

```bash
docker-compose up -d
```

The application will be available at `http://localhost:8000`

### Or build and run with Docker directly:

```bash
# Build the image
docker build -t retro-board .

# Run the container
docker run -d \
  -p 8000:8000 \
  -v retro-data:/data \
  -e DATABASE_PATH=/data/retro.db \
  --name retro-board \
  retro-board
```

## Docker Commands

### View logs:
```bash
docker-compose logs -f
```

### Stop the container:
```bash
docker-compose down
```

### Rebuild after code changes:
```bash
docker-compose up -d --build
```

### Remove everything including data:
```bash
docker-compose down -v
```

## How It Works

The Dockerfile uses a multi-stage build:

1. **Stage 1 (frontend-build)**: Builds the React frontend
   - Uses Node 20 Alpine
   - Runs `npm install` and `npm run build`
   - Creates optimized static files in `/frontend/dist`

2. **Stage 2 (backend)**: Sets up Python backend and serves everything
   - Uses Python 3.13 slim
   - Installs Python dependencies
   - Copies built frontend to `/app/static`
   - FastAPI serves both API and static frontend files
   - SQLite database persists in `/data` volume

## Environment Variables

- `DATABASE_PATH`: Path to SQLite database (default: `/data/retro.db`)
- `VITE_API_URL`: API URL for frontend (optional, defaults to current origin)
- `VITE_WS_URL`: WebSocket URL for frontend (optional, auto-constructed from location)

## Accessing the Application

- **Frontend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Data Persistence

The database is stored in a Docker volume named `retro-data`. This means:
- Data persists across container restarts
- Data survives container deletion (unless you use `docker-compose down -v`)
- Multiple boards and sessions are preserved

## Production Considerations

For production deployment:

1. **Use HTTPS**: Put behind a reverse proxy (nginx/Caddy) with SSL
2. **Environment variables**: Set proper CORS origins if needed
3. **Backups**: Backup the `/data` volume regularly
4. **Resource limits**: Add memory/CPU limits in docker-compose.yml
5. **Health checks**: Already configured, monitor with your orchestrator

Example with resource limits:
```yaml
services:
  retro-board:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Troubleshooting

### Container won't start:
```bash
docker-compose logs retro-board
```

### Database issues:
```bash
# Access the container
docker-compose exec retro-board sh

# Check database
ls -la /data/
sqlite3 /data/retro.db ".tables"
```

### Frontend not loading:
- Check that `/app/static` exists in container
- Verify build completed successfully in Stage 1

### Port already in use:
Edit `docker-compose.yml` and change `"8000:8000"` to `"8080:8000"` (or any other port)
