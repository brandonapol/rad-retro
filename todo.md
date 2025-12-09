# Retro Board - Lightweight Implementation

## Project Overview
Build a single-container retro board application using FastAPI (Python), SQLite, and React/TypeScript. The app supports real-time collaboration for scrum retrospectives with ephemeral data storage (24-hour retention).

## Tech Stack
- Backend: FastAPI with WebSocket support
- Database: SQLite with automatic cleanup
- Frontend: Vite + React + TypeScript
- Deployment: Single Docker container for DigitalOcean

## Backend Requirements

### Setup
- Create FastAPI application with CORS middleware
- Set up SQLite database connection with WAL mode enabled
- Configure WebSocket manager for broadcasting updates
- Add background task for cleaning up sessions older than 24 hours

### Database Schema
Create tables:
- `sessions`: session_id (TEXT PRIMARY KEY), created_at (TIMESTAMP)
- `cards`: id (INTEGER PRIMARY KEY), session_id (TEXT), category (TEXT), content (TEXT), author (TEXT), created_at (TIMESTAMP)
  - category values: "well", "badly", "continue", "kudos", "actionables"
- `actionables`: card_id (INTEGER FOREIGN KEY), completed (BOOLEAN DEFAULT FALSE)

### API Endpoints
- `GET /api/session/{session_id}` - Fetch all cards and actionables for a session
- `POST /api/session/{session_id}/card` - Create new card (body: category, content, author)
- `PATCH /api/card/{card_id}` - Update card or toggle actionable completion
- `DELETE /api/card/{card_id}` - Delete card
- `POST /api/session/create` - Generate new session ID and return it

### WebSocket
- `WS /ws/{session_id}` - WebSocket connection per session
- Broadcast events: card_added, card_updated, card_deleted
- Event payload: full card object with metadata

### Background Tasks
- Scheduled task (runs every hour) to delete sessions and associated cards older than 24 hours

## Frontend Requirements

### Setup
- Vite project with React and TypeScript
- Functional components only
- WebSocket client for real-time updates
- No comments or emojis in code

### Routing
- Route: `/` - Landing page with "Create New Retro" button
- Route: `/retro/{session_id}` - Retro board interface

### Components
- `NamePrompt`: Modal on first load asking for user name, store in localStorage
- `RetroColumn`: Reusable column component for each category
- `Card`: Individual sticky note display with author name and delete button
- `ActionablesList`: Separate section with checkboxes for actionables
- `AddCardButton`: Floating button to add new card to a column

### Layout
- Four columns at top: "What Went Well", "What Went Badly", "Continue Doing", "Kudos"
- Actionables section below with checkbox list
- Each column has add button
- Cards show author name and content

### State Management
- Use React hooks for local state
- WebSocket connection establishes on mount
- Handle incoming WebSocket messages to update UI in real-time
- Optimistic updates for card additions

### Features
- Add card to any category with author name pre-filled
- Delete own cards
- Toggle actionable completion (syncs across all users)
- Copy session URL button for sharing
- Auto-reconnect WebSocket on disconnect

## Docker Setup

### Dockerfile
- Multi-stage build
- Stage 1: Build frontend with Node.js
- Stage 2: Python runtime with FastAPI
- Copy built frontend assets to static directory
- Expose single port (8000)
- CMD runs uvicorn server

### Docker Compose (optional for local dev)
- Single service
- Volume mount for development
- Port mapping

## Deployment Configuration
- Single container deployed to DigitalOcean
- Environment variables: DATABASE_PATH (default to /tmp/retro.db)
- Health check endpoint: `GET /health`

## Additional Features
- Session ID generation using short random strings (8 chars)
- Export board as JSON button
- Simple styling with Tailwind CSS or similar
- Mobile responsive layout

## Development Notes
- Use SQLite in-memory for tests
- FastAPI serves both API and static frontend files
- WebSocket connection per session to minimize broadcast scope
- No authentication needed since sessions are ephemeral and URL-based
