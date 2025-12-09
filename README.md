# Retro Board

A lightweight, real-time collaborative retrospective board application for agile teams. Built with FastAPI, SQLite, React, and TypeScript.

## Features

- Real-time collaboration via WebSockets
- Four retro categories: What Went Well, What Went Badly, Continue Doing, Kudos
- Action items with checkbox tracking
- Ephemeral sessions (24-hour retention)
- Simple URL-based sharing
- No authentication required
- Mobile responsive design

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+ (or bun)
- Make

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

## Docker

Run with Docker Compose:

```bash
cd backend
docker-compose up --build
```

## Environment Variables

### Backend
- `DATABASE_PATH` - SQLite database path (default: `/tmp/retro.db`)

### Frontend
- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000`)
- `VITE_WS_URL` - WebSocket URL (default: `ws://localhost:8000`)

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
