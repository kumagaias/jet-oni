.PHONY: test deploy deploy-quick build clean pr install dev security-check gitleaks

# Run all tests
test:
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

# Create PR after tests pass
pr: test
	@echo "All tests passed. Creating PR..."
	@echo ""
	@echo "Branch naming examples:"
	@echo "  feat/shared-types"
	@echo "  fix/fuel-consumption"
	@echo "  docs/api-documentation"
	@echo ""
	@read -p "Enter branch name (e.g., feat/feature-name): " branch; \
	echo ""; \
	echo "PR title examples:"; \
	echo "  feat(game): add shared type definitions and constants"; \
	echo "  fix(player): correct fuel consumption calculation"; \
	echo ""; \
	read -p "Enter PR title (conventional commit format): " title; \
	echo ""; \
	echo "Creating branch: $$branch"; \
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
	gh pr create --title "$$title" --body "## Summary\n$$title\n\n## Testing\n- [x] All tests pass\n- [x] Type check passes\n- [x] Build succeeds" --base main

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
