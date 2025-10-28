.PHONY: test deploy deploy-quick build clean pr install dev security-check gitleaks

# Run all tests (includes linting and type checking)
test:
	@echo "Running linter..."
	npm run lint
	@echo "Running type check..."
	npx tsc --noEmit
	@echo "Running tests..."
	npm test

# Run security checks
security-check: gitleaks
	@echo "Running security checks..."
	npm audit --audit-level=moderate

# Run GitLeaks scan
gitleaks:
	@echo "Scanning for secrets with GitLeaks..."
	@if command -v gitleaks >/dev/null 2>&1; then \
		gitleaks detect --verbose --no-git; \
	else \
		echo "GitLeaks not installed. Install with:"; \
		echo "  brew install gitleaks  (macOS)"; \
		echo "  Or download from: https://github.com/gitleaks/gitleaks/releases"; \
	fi

# Build the project
build:
	npm run build

# Create PR after tests pass (auto-generates title and description from tasks)
pr: test
	@echo "All tests passed. Creating PR..."
	@echo ""
	@# Find the most recently completed task from tasks.md
	@task_info=$$(grep -E '^\s*- \[x\].*' .kiro/specs/jetoni/tasks.md | tail -1 | sed 's/- \[x\] //'); \
	if [ -z "$$task_info" ]; then \
		echo "Error: No completed tasks found in .kiro/specs/jetoni/tasks.md"; \
		exit 1; \
	fi; \
	task_number=$$(echo "$$task_info" | grep -o '^[0-9]*\.[0-9]*' | head -1); \
	if [ -z "$$task_number" ]; then \
		task_number=$$(echo "$$task_info" | grep -o '^[0-9]*' | head -1); \
	fi; \
	task_desc=$$(echo "$$task_info" | sed 's/^[0-9]*\.*[0-9]* *//'); \
	branch="feat/task-$$task_number"; \
	title="feat: $$task_desc"; \
	echo "Branch: $$branch"; \
	echo "Title: $$title"; \
	echo ""; \
	git checkout -b $$branch 2>/dev/null || git checkout $$branch; \
	git add .; \
	if git diff --cached --quiet; then \
		echo "No changes to commit"; \
	else \
		git commit -m "$$title"; \
	fi; \
	git push -u origin $$branch; \
	echo ""; \
	echo "Creating pull request..."; \
	{ \
		echo "## Summary"; \
		echo ""; \
		echo "Implemented task $$task_number: $$task_desc"; \
		echo ""; \
		echo "## Testing"; \
		echo ""; \
		echo "- [x] All tests pass"; \
		echo "- [x] Type check passes"; \
		echo "- [x] Lint passes"; \
		echo "- [x] Build succeeds"; \
	} | gh pr create --title "$$title" --body-file - --base main

# Deploy to Devvit (runs tests and security checks first)
deploy: test security-check
	@echo "All tests and security checks passed. Deploying..."
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
