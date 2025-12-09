# Retro Board Backend

FastAPI backend for the Retro Board application with SQLite database and WebSocket support.

## Quick Start

### Using Make (Recommended)

```bash
make install          # Install dependencies
make dev             # Run development server
make test            # Run tests
make docker-run      # Run with Docker Compose
```

Run `make help` to see all available commands.

### Using Docker Compose

```bash
docker-compose up --build
```

The API will be available at http://localhost:8000

### Manual Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize the database:
```bash
make init-db
# or manually:
python -c "import asyncio; from app.database import init_db; asyncio.run(init_db())"
```

## Running Tests

Using Make:
```bash
make test              # Run all tests
make test-verbose      # Run with verbose output
make test-coverage     # Run with coverage report
```

Using pytest directly:
```bash
pytest                           # Run all tests
pytest tests/test_database.py   # Run specific test file
pytest tests/test_api.py
pytest tests/test_websocket.py
pytest --cov=app --cov-report=html  # With coverage
```

## Running the Server

### Using Make
```bash
make dev              # Development mode with auto-reload
make run              # Production mode
```

### Using uvicorn directly
Development mode:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Using Docker
```bash
make docker-build     # Build Docker image
make docker-run       # Run with docker-compose
make docker-stop      # Stop containers
```

Or use docker-compose directly:
```bash
docker-compose up --build
docker-compose down
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application and routes
│   ├── database.py              # Database operations
│   ├── models.py                # Pydantic models
│   └── websocket_manager.py    # WebSocket connection manager
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Pytest configuration
│   ├── test_database.py        # Database tests
│   ├── test_api.py             # API endpoint tests
│   └── test_websocket.py       # WebSocket tests
├── schema.sql                   # Database schema
├── requirements.txt             # Python dependencies
├── pytest.ini                   # Pytest configuration
├── Makefile                     # Make commands for development
├── Dockerfile                   # Docker container definition
├── docker-compose.yml          # Docker Compose configuration
├── .dockerignore               # Docker ignore patterns
└── README.md                    # This file
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/session/create` - Create new session
- `GET /api/session/{session_id}` - Get session data with all cards
- `POST /api/session/{session_id}/card` - Add new card
- `PATCH /api/card/{card_id}` - Update card or toggle actionable
- `DELETE /api/card/{card_id}` - Delete card
- `WS /ws/{session_id}` - WebSocket connection for real-time updates

## WebSocket Events

- `card_added` - Broadcasted when a new card is added
- `card_updated` - Broadcasted when a card is updated
- `card_deleted` - Broadcasted when a card is deleted

## Environment Variables

- `DATABASE_PATH` - Path to SQLite database file (default: `/tmp/retro.db`)

## Database Schema

### sessions
- `session_id` (TEXT PRIMARY KEY)
- `created_at` (TIMESTAMP)

### cards
- `id` (INTEGER PRIMARY KEY)
- `session_id` (TEXT, FOREIGN KEY)
- `category` (TEXT: well, badly, continue, kudos, actionables)
- `content` (TEXT)
- `author` (TEXT)
- `created_at` (TIMESTAMP)

### actionables
- `card_id` (INTEGER PRIMARY KEY, FOREIGN KEY)
- `completed` (BOOLEAN)
