.PHONY: help install dev watch stop-watch backend frontend test clean

help:
	@echo "Retro Board - Development Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      Install all dependencies (backend + frontend)"
	@echo "  make watch        Run backend + frontend simultaneously"
	@echo "  make backend      Run backend only"
	@echo "  make frontend     Run frontend only"
	@echo "  make test         Run backend tests"
	@echo "  make clean        Clean up all generated files"
	@echo ""
	@echo "Backend commands:"
	@echo "  cd backend && make help"
	@echo ""
	@echo "Frontend commands:"
	@echo "  cd frontend && make help"

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "All dependencies installed!"

watch:
	@echo "Starting backend and frontend..."
	@trap 'kill 0' EXIT; \
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 & \
	cd frontend && npm run dev & \
	wait

backend:
	cd backend && make dev

frontend:
	cd frontend && make dev

test:
	cd backend && make test

clean:
	cd backend && make clean
	cd frontend && make clean
	@echo "Cleanup complete!"
