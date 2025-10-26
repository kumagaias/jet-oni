.PHONY: test deploy deploy-quick build clean pr install dev

# Run all tests
test:
	npm test

# Build the project
build:
	npm run build

# Create PR after tests pass (auto-generates title and branch from recent commits)
pr: test
	@echo "All tests passed. Creating PR..."
	@title="$$(git log --format=%s -n 1)"; \
	if [ -z "$$title" ]; then \
		echo "No commits found. Please make a commit first."; \
		exit 1; \
	fi; \
	branch="feature/$$(echo "$$title" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')-$$(date +%s)"; \
	echo "PR Title: $$title"; \
	echo "Branch: $$branch"; \
	git checkout -b $$branch; \
	git add .; \
	git commit -m "$$title" --allow-empty; \
	git push -u origin $$branch; \
	gh pr create --title "$$title" --body "Auto-generated PR after successful tests" --base main

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
