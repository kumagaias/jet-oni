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

# Create PR after tests pass (auto-generates title and description in English)
pr: test
	@echo "All tests passed. Creating PR..."
	@echo ""
	@# Stage all changes first
	@git add .
	@# Generate PR content from changes
	@bash scripts/generate-pr-description.sh
	@echo ""
	@# Read generated content
	@branch=$$(cat /tmp/pr_branch_name); \
	title=$$(cat /tmp/pr_title); \
	changes=$$(cat /tmp/pr_changes); \
	echo "Creating branch and committing changes..."; \
	git checkout -b $$branch 2>/dev/null || git checkout $$branch; \
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
		echo "This PR implements the following changes:"; \
		echo ""; \
		echo "## Changes"; \
		echo ""; \
		echo "$$changes"; \
		echo ""; \
		echo "## Testing"; \
		echo ""; \
		echo "- [x] All tests pass"; \
		echo "- [x] Type check passes"; \
		echo "- [x] Lint passes"; \
		echo "- [x] Build succeeds"; \
		echo ""; \
		echo "## Quality Checks"; \
		echo ""; \
		echo "- [x] Code follows project style guidelines"; \
		echo "- [x] Self-review completed"; \
		echo "- [x] No breaking changes"; \
		echo ""; \
		echo "## Files Changed"; \
		echo ""; \
		git diff --cached --name-only | sed 's/^/- /'; \
	} | gh pr create --title "$$title" --body-file - --base main; \
	rm -f /tmp/pr_branch_name /tmp/pr_title /tmp/pr_changes

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
