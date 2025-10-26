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
.PHONY: test deploy deploy-quick build clean pr

# Run all tests
test:
	npm test

# Build the project
build:
	npm run build

# Create PR after tests pass
pr: test
	@echo "All tests passed. Creating PR..."
	@read -p "Enter branch name: " branch; \
	read -p "Enter PR title: " title; \
	git checkout -b $$branch; \
	git add .; \
	git commit -m "$$title"; \
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
```

## Deployment Workflow

### Standard Deployment Process

1. **Write code**: Implement features or fixes
2. **Write tests**: Add tests for new functionality
3. **Run tests locally**: `npm test` or `make test`
4. **Fix failures**: Address any test failures
5. **Create PR**: `make pr` (recommended for team collaboration)
6. **Deploy**: `make deploy` (after PR is merged)

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

### Pull Request Workflow (Recommended)

For team collaboration, use the PR workflow:

```bash
# After implementing a feature and tests pass
make pr
```

This will:
1. Run all tests
2. Prompt for branch name (e.g., `feature/player-movement`)
3. Prompt for PR title (e.g., `Add player movement controls`)
4. Create a new branch
5. Commit changes
6. Push to remote
7. Create a pull request using GitHub CLI

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
- **Feature branches**: Individual features (use `make pr`)

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

## Continuous Integration and Security

### Required GitHub Actions Workflows

All projects must include the following GitHub Actions workflows for security and quality assurance:

#### 1. CodeQL Security Scanning

Create `.github/workflows/codeql.yml`:

```yaml
name: "CodeQL Security Scan"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript', 'typescript' ]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: ${{ matrix.language }}
        queries: security-extended,security-and-quality

    - name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        category: "/language:${{matrix.language}}"
```

#### 2. Dependency Security Check

Create `.github/workflows/dependency-check.yml`:

```yaml
name: "Dependency Security Check"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  dependency-check:
    name: Check Dependencies
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'

    - name: Install dependencies
      run: npm ci

    - name: Run npm audit
      run: npm audit --audit-level=moderate
      continue-on-error: true

    - name: Check for outdated packages
      run: npm outdated || true

    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      continue-on-error: true
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

#### 3. Secret Scanning Prevention

Create `.github/workflows/secret-scan.yml`:

```yaml
name: "Secret Scanning"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  secret-scan:
    name: Scan for Secrets
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: TruffleHog Secret Scan
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: ${{ github.event.repository.default_branch }}
        head: HEAD
        extra_args: --debug --only-verified
```

#### 4. CI/CD Pipeline with Security

Create `.github/workflows/ci.yml`:

```yaml
name: "CI/CD Pipeline"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run type check
      run: npx tsc --noEmit

    - name: Run tests
      run: npm test

    - name: Build project
      run: npm run build

  deploy:
    name: Deploy to Devvit
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build

    - name: Deploy to Devvit
      run: npm run launch
      env:
        DEVVIT_TOKEN: ${{ secrets.DEVVIT_TOKEN }}
```

### Security Best Practices

#### 1. Secrets Management

- **Never commit secrets**: Use GitHub Secrets for sensitive data
- **Use environment variables**: Store API keys, tokens in secrets
- **Rotate secrets regularly**: Change secrets periodically

Required secrets:
- `DEVVIT_TOKEN`: Devvit authentication token
- `SNYK_TOKEN`: Snyk security scanning token (optional)

#### 2. Dependency Management

- **Keep dependencies updated**: Run `npm audit` regularly
- **Review security advisories**: Check GitHub security alerts
- **Use lock files**: Commit `package-lock.json`
- **Audit before deploy**: Run security checks before deployment

#### 3. Code Security

- **Enable CodeQL**: Automatic security vulnerability detection
- **Review security alerts**: Address CodeQL findings promptly
- **Follow secure coding practices**: Avoid common vulnerabilities
- **Input validation**: Validate all user inputs
- **Output encoding**: Prevent XSS attacks

#### 4. Branch Protection

Configure branch protection rules on GitHub:

- **Require pull request reviews**: At least 1 approval
- **Require status checks**: All CI checks must pass
- **Require CodeQL scan**: Security scan must pass
- **Restrict force push**: Prevent history rewriting
- **Require signed commits**: Verify commit authenticity (optional)

### Setting Up Security Workflows

1. **Create workflow files**:
```bash
mkdir -p .github/workflows
# Create the 4 workflow files above
```

2. **Configure GitHub Secrets**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add `DEVVIT_TOKEN`
   - Add `SNYK_TOKEN` (optional, for enhanced scanning)

3. **Enable Dependabot**:
   - Go to repository Settings → Security → Dependabot
   - Enable Dependabot alerts
   - Enable Dependabot security updates

4. **Enable CodeQL**:
   - Go to repository Settings → Security → Code scanning
   - Set up CodeQL analysis
   - Or use the workflow file above

5. **Configure branch protection**:
   - Go to repository Settings → Branches
   - Add rule for `main` branch
   - Enable required status checks

### Monitoring Security

- **Review security alerts**: Check GitHub Security tab regularly
- **Monitor CodeQL results**: Review findings and fix issues
- **Check dependency alerts**: Update vulnerable dependencies
- **Review audit logs**: Monitor repository access and changes

## Best Practices

1. **Always run tests**: Never skip tests before deployment
2. **Use PR workflow**: Use `make pr` for feature development
3. **Commit frequently**: Make small, focused commits
4. **Test locally first**: Use `npm run dev` to test before deploying
5. **Review changes**: Check `git status` and `git diff` before deploying
6. **Code review**: Have team members review PRs before merging
7. **Monitor deployments**: Check Devvit dashboard after deployment
8. **Keep Makefile simple**: Don't overcomplicate the deployment process
9. **Document custom targets**: Add comments for any custom Makefile targets

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

## Prerequisites

### GitHub CLI Installation

The `make pr` command requires GitHub CLI (`gh`):

**macOS**:
```bash
brew install gh
```

**Linux**:
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora/RHEL
sudo dnf install gh
```

**Authentication**:
```bash
gh auth login
```

Follow the prompts to authenticate with GitHub.

## Summary

The Makefile-based deployment workflow ensures:

- ✅ Code quality through automated testing
- ✅ Version control through git commits
- ✅ Pull request workflow for code review
- ✅ Consistent deployment process
- ✅ Reduced human error
- ✅ Audit trail of deployments

**Recommended workflow**:
1. Use `make pr` for feature development (creates PR after tests pass)
2. Review and merge PR on GitHub
3. Use `make deploy` for production deployments

Always ensure all quality checks pass before code reaches users.
