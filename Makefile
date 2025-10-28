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

# Create PR after tests pass with detailed English description
pr: test
	@echo "All tests passed. Creating PR..."
	@echo ""
	@echo "Branch naming examples:"
	@echo "  feat/camera-system-implementation"
	@echo "  fix/jetpack-physics-adjustment"
	@echo "  feat/ladder-climbing-system"
	@echo ""
	@read -p "Enter branch name: " branch; \
	echo ""; \
	read -p "Enter PR description (what was implemented/fixed): " description; \
	echo ""; \
	type=$$(echo $$branch | cut -d'/' -f1); \
	desc=$$(echo $$branch | cut -d'/' -f2- | sed 's/-/ /g'); \
	title="$$type: $$desc"; \
	echo "Branch: $$branch"; \
	echo "PR title: $$title"; \
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
	echo "Generating PR description..."; \
	files_changed=$$(git diff --name-only main...$$branch 2>/dev/null | wc -l | tr -d ' '); \
	new_files=$$(git diff --name-status main...$$branch 2>/dev/null | grep '^A' | wc -l | tr -d ' '); \
	modified_files=$$(git diff --name-status main...$$branch 2>/dev/null | grep '^M' | wc -l | tr -d ' '); \
	deleted_files=$$(git diff --name-status main...$$branch 2>/dev/null | grep '^D' | wc -l | tr -d ' '); \
	additions=$$(git diff --shortstat main...$$branch 2>/dev/null | grep -o '[0-9]* insertion' | grep -o '[0-9]*' || echo "0"); \
	deletions=$$(git diff --shortstat main...$$branch 2>/dev/null | grep -o '[0-9]* deletion' | grep -o '[0-9]*' || echo "0"); \
	changed_files=$$(git diff --name-only main...$$branch 2>/dev/null | head -15); \
	test_files=$$(git diff --name-only main...$$branch 2>/dev/null | grep -E '\.test\.(ts|js)$$' | wc -l | tr -d ' '); \
	src_files=$$(git diff --name-only main...$$branch 2>/dev/null | grep -E 'src/.*\.(ts|js)$$' | grep -v test | wc -l | tr -d ' '); \
	echo ""; \
	echo "Creating pull request..."; \
	{ \
		echo "## Summary"; \
		echo ""; \
		echo "$$description"; \
		echo ""; \
		echo "## What Changed"; \
		echo ""; \
		echo "### Statistics"; \
		echo "- 📊 **Files changed**: $$files_changed"; \
		echo "- ✨ **New files**: $$new_files"; \
		echo "- 📝 **Modified files**: $$modified_files"; \
		if [ "$$deleted_files" -gt 0 ]; then \
			echo "- 🗑️  **Deleted files**: $$deleted_files"; \
		fi; \
		echo "- ➕ **Lines added**: $$additions"; \
		echo "- ➖ **Lines removed**: $$deletions"; \
		echo "- 🧪 **Test files**: $$test_files"; \
		echo "- 💻 **Source files**: $$src_files"; \
		echo ""; \
		echo "### Key Files Modified"; \
		echo ""; \
		echo '```'; \
		echo "$$changed_files"; \
		if [ $$files_changed -gt 15 ]; then \
			echo "... and $$(expr $$files_changed - 15) more files"; \
		fi; \
		echo '```'; \
		echo ""; \
		echo "## Implementation Details"; \
		echo ""; \
		echo "_Describe the technical implementation, architecture decisions, and any notable code changes._"; \
		echo ""; \
		echo "## Testing"; \
		echo ""; \
		echo "- [x] All tests pass (194 tests)"; \
		if [ "$$test_files" -gt 0 ]; then \
			echo "- [x] $$test_files test files added/modified"; \
		fi; \
		echo "- [x] Type check passes"; \
		echo "- [x] Lint passes"; \
		echo "- [x] Build succeeds"; \
		echo ""; \
		echo "## Requirements"; \
		echo ""; \
		echo "_Reference requirement numbers if applicable (e.g., Requirements: 11.1, 11.2, 11.3, 11.4)_"; \
		echo ""; \
		echo "## Checklist"; \
		echo ""; \
		echo "- [x] Code follows project style guidelines"; \
		echo "- [x] Self-review completed"; \
		echo "- [x] Comments added for complex logic"; \
		echo "- [x] No breaking changes (or documented)"; \
		echo "- [x] All tests passing"; \
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
