.PHONY: help install dev test test-verbose test-coverage clean docker-build docker-run docker-stop init-db

help:
	@echo "Available commands:"
	@echo "  make install         Install dependencies"
	@echo "  make dev            Run development server with auto-reload"
	@echo "  make run            Run production server"
	@echo "  make test           Run all tests"
	@echo "  make test-verbose   Run tests with verbose output"
	@echo "  make test-coverage  Run tests with coverage report"
	@echo "  make init-db        Initialize database"
	@echo "  make clean          Clean up generated files"
	@echo "  make docker-build   Build Docker image"
	@echo "  make docker-run     Run with docker-compose"
	@echo "  make docker-stop    Stop docker-compose"

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	pytest

test-verbose:
	pytest -v

test-coverage:
	pytest --cov=app --cov-report=html --cov-report=term

init-db:
	python -c "import asyncio; from app.database import init_db; asyncio.run(init_db())"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.db" -delete
	find . -type f -name "*.db-shm" -delete
	find . -type f -name "*.db-wal" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

docker-build:
	docker-compose build

docker-run:
	docker-compose up

docker-stop:
	docker-compose down
