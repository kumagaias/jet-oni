---
inclusion: always
---

# Deployment Workflow

## Makefile Requirements

All projects must include a Makefile with automated deployment workflow that ensures code quality before deployment.

### Required Makefile Targets

#### 1. Test Target

```makefile
test:
	npm test
```

- **Purpose**: Run all unit tests
- **Requirement**: All tests must pass before proceeding to deployment
- **Exit code**: Must return non-zero exit code if any test fails

#### 2. Deploy Target

```makefile
deploy: test
	git add .
	git commit -m "Deploy: $(shell date '+%Y-%m-%d %H:%M:%S')"
	git push
	npm run launch
```

- **Purpose**: Deploy to Devvit after successful tests
- **Dependencies**: Depends on `test` target (tests must pass first)
- **Steps**:
  1. Run all unit tests
  2. Stage all changes (`git add .`)
  3. Commit with timestamp (`git commit`)
  4. Push to remote repository (`git push`)
  5. Upload to Devvit (`npm run launch`)

#### 3. Quick Deploy Target (Optional)

```makefile
deploy-quick:
	git add .
	git commit -m "Quick deploy: $(shell date '+%Y-%m-%d %H:%M:%S')"
	git push
	npm run launch
```

- **Purpose**: Deploy without running tests (use with caution)
- **Use case**: Emergency fixes or when tests are known to pass
- **Warning**: Should be used sparingly

### Complete Makefile Example

```makefile
.PHONY: test deploy deploy-quick build clean

# Run all tests
test:
	npm test

# Build the project
build:
	npm run build

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
```

## Deployment Workflow

### Standard Deployment Process

1. **Write code**: Implement features or fixes
2. **Write tests**: Add tests for new functionality
3. **Run tests locally**: `npm test` or `make test`
4. **Fix failures**: Address any test failures
5. **Deploy**: `make deploy`

### Deployment Steps (Automated)

When you run `make deploy`, the following happens automatically:

1. ✅ **Run tests**: All unit tests are executed
2. ✅ **Verify tests pass**: Deployment stops if any test fails
3. ✅ **Stage changes**: All modified files are staged with `git add .`
4. ✅ **Commit changes**: Changes are committed with timestamp
5. ✅ **Push to remote**: Code is pushed to remote repository
6. ✅ **Upload to Devvit**: App is uploaded to Devvit platform

### Error Handling

If any step fails, the deployment process stops:

- **Tests fail**: Deployment stops, fix tests before deploying
- **Git commit fails**: Check for uncommitted changes or conflicts
- **Git push fails**: Check network connection and repository access
- **Devvit upload fails**: Check Devvit credentials and project configuration

## Git Workflow

### Commit Messages

- **Automated commits**: Use timestamp-based commit messages
- **Manual commits**: Use descriptive commit messages before running `make deploy`

Example:
```bash
git add .
git commit -m "Add beacon ability for oni players"
make deploy
```

### Branch Strategy

- **Main branch**: Production-ready code
- **Development branch**: Active development
- **Feature branches**: Individual features

Deploy from appropriate branch:
```bash
git checkout main
make deploy
```

## Devvit Upload

### Prerequisites

1. **Devvit CLI installed**: `npm install -g devvit`
2. **Authenticated**: `devvit login`
3. **Project configured**: Valid `devvit.json` file

### Upload Command

The `npm run launch` command (defined in `package.json`) should execute:

```json
{
  "scripts": {
    "launch": "devvit upload"
  }
}
```

### Devvit Configuration

Ensure `devvit.json` is properly configured:

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your app description",
  "permissions": [
    "redis",
    "realtime"
  ]
}
```

## Testing Before Deployment

### Local Testing

Before deploying, test locally:

```bash
# Run development server
npm run dev

# Run tests
npm test

# Build project
npm run build
```

### Playtest on Devvit

After deployment, test on Devvit:

```bash
# Start playtest
npm run dev

# Or manually
devvit playtest r/your-test-subreddit
```

## Continuous Integration (Optional)

For larger projects, consider setting up CI/CD:

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Deploy to Devvit
        run: npm run launch
        env:
          DEVVIT_TOKEN: ${{ secrets.DEVVIT_TOKEN }}
```

## Best Practices

1. **Always run tests**: Never skip tests before deployment
2. **Commit frequently**: Make small, focused commits
3. **Test locally first**: Use `npm run dev` to test before deploying
4. **Review changes**: Check `git status` and `git diff` before deploying
5. **Monitor deployments**: Check Devvit dashboard after deployment
6. **Keep Makefile simple**: Don't overcomplicate the deployment process
7. **Document custom targets**: Add comments for any custom Makefile targets

## Troubleshooting

### Tests Fail

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- path/to/test.ts
```

### Git Push Fails

```bash
# Check remote
git remote -v

# Pull latest changes
git pull origin main

# Resolve conflicts and try again
make deploy
```

### Devvit Upload Fails

```bash
# Check authentication
devvit whoami

# Re-authenticate
devvit login

# Check project configuration
cat devvit.json
```

## Summary

The Makefile-based deployment workflow ensures:

- ✅ Code quality through automated testing
- ✅ Version control through git commits
- ✅ Consistent deployment process
- ✅ Reduced human error
- ✅ Audit trail of deployments

Always use `make deploy` for production deployments to ensure all quality checks pass before code reaches users.
