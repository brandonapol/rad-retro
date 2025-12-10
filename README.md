# Retro Board

A lightweight, real-time collaborative retrospective board application for agile teams. Built with FastAPI, SQLite, React, and TypeScript.

## Features

- Real-time collaboration via WebSockets
- Four retro categories: What Went Well, What Went Badly, Continue Doing, Kudos
- Action items with checkbox tracking
- Board naming and listing
- Simple URL-based sharing
- Username persistence via localStorage
- CSV export functionality
- No authentication required
- Mobile responsive design

## Quick Start

**🐳 Deploy with Docker (recommended):**
```bash
./docker-start.sh
# Visit http://localhost:8000
```

**💻 Or run locally for development:**
```bash
make install && make watch
# Visit http://localhost:5173
```

---

### Prerequisites

**For local development:**
- Python 3.11+
- Node.js 20+ (or bun)
- Make

**For Docker deployment:**
- Docker
- Docker Compose

### Run Locally

```bash
make install
make watch
```

This will start both the backend (port 8000) and frontend (port 5173) simultaneously.

Access the application at: http://localhost:5173

### Individual Services

Run backend only:
```bash
make backend
```

Run frontend only:
```bash
make frontend
```

Run tests:
```bash
make test
```

## Project Structure

```
rad-retro/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI app and routes
│   │   ├── database.py  # Database operations
│   │   ├── models.py    # Pydantic models
│   │   └── websocket_manager.py
│   ├── tests/           # Backend tests
│   ├── schema.sql       # Database schema
│   └── Makefile
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utility functions
│   └── Makefile
├── Makefile             # Root Makefile
└── README.md            # This file
```

## API Endpoints

- `POST /api/session/create` - Create new session
- `GET /api/session/{session_id}` - Get session data
- `POST /api/session/{session_id}/card` - Add card
- `PATCH /api/card/{card_id}` - Update card
- `DELETE /api/card/{card_id}` - Delete card
- `WS /ws/{session_id}` - WebSocket connection

## Development

### Backend

```bash
cd backend
make install
make dev
make test
```

See [backend/README.md](backend/README.md) for more details.

### Frontend

```bash
cd frontend
make install
make dev
```

The frontend uses:
- Vite for fast development and building
- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation

## Docker Deployment

### Quick Start with Docker

The easiest way to deploy with Docker:

```bash
./docker-start.sh
```

This script will:
- Build the Docker image (frontend + backend in one container)
- Start the container with database persistence
- Wait for the service to be healthy
- Display the application URL

**Or manually with docker-compose:**

```bash
docker-compose up -d --build
```

Access the application at: http://localhost:8000

### Docker Features

- **Single container** - Frontend and backend bundled together
- **Persistent data** - Database stored in Docker volume
- **Health checks** - Automatic monitoring
- **Production-ready** - Optimized build with Vite

See [README.docker.md](README.docker.md) for detailed Docker documentation.

## Environment Variables

### Backend
- `DATABASE_PATH` - SQLite database path (default: `/tmp/retro.db` local, `/data/retro.db` Docker)

### Frontend
- `VITE_API_URL` - Backend API URL (optional - auto-detects in Docker)
- `VITE_WS_URL` - WebSocket URL (optional - auto-constructed in Docker)

See `.env.example` for configuration templates.

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- SQLite with WAL mode - Lightweight database
- WebSockets - Real-time communication
- aiosqlite - Async database operations
- Pydantic - Data validation

### Frontend
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- React Router - Routing
- Tailwind CSS - Styling

## Testing

Backend includes comprehensive test coverage:
- Database operations tests
- API endpoint tests
- WebSocket functionality tests

Run tests:
```bash
make test
```

## License

MIT
