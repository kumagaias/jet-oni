.PHONY: test deploy deploy-quick build clean pr install dev

# Run all tests
test:
	npm test

# Build the project
build:
	npm run build

# Create PR after tests pass (prompts for branch name, auto-fills PR from commits)
pr: test
	@echo "All tests passed. Creating PR..."
	@read -p "Enter branch name: " branch; \
	echo "Creating branch: $$branch"; \
	git checkout -b $$branch; \
	git add .; \
	git commit -m "$$branch" --allow-empty; \
	git push -u origin $$branch; \
	gh pr create --fill --base main

# Deploy to Devvit (runs tests first)
deploy: test
	@echo "All tests passed. Deploying..."
	git add .
	git commit -m "Deploy: $(shell date '+%Y-%m-%d %H:%M:%S')"
	git push
	npm run launch

# Quick deploy without tests (use with caution)
deploy-quick:
	@echo "WARNING: Deploying without running tests"
	git add .
	git commit -m "Quick deploy: $(shell date '+%Y-%m-%d %H:%M:%S')"
	git push
	npm run launch

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf node_modules/

# Install dependencies
install:
	npm install

# Development server
dev:
	npm run dev
