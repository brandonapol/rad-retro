.PHONY: help install dev build preview clean

help:
	@echo "Available commands:"
	@echo "  make install    Install dependencies with npm"
	@echo "  make dev        Run development server"
	@echo "  make build      Build for production"
	@echo "  make preview    Preview production build"
	@echo "  make clean      Clean up generated files"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf node_modules dist .vite
