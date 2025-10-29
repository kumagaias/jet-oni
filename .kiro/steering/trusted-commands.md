---
inclusion: always
---

# Trusted Commands

This file contains a list of pre-approved bash commands that are frequently used in this project. When you need to run a command, **always check this list first** and use the exact command listed here if available. This improves efficiency by reusing trusted commands.

## Build Commands

```bash
# Build the entire project
npm run build

# Build with output (last 20 lines)
npm run build 2>&1 | tail -20

# Build client only
npm run build:client

# Build server only
npm run build:server
```

## Test Commands

```bash
# Run all tests
npm test

# Run tests with make
make test

# Run specific test file
npm test -- path/to/test.ts

# Run tests in watch mode (for development only, not in CI)
npm test -- --watch
```

## Type Checking

```bash
# Type check all projects
npx tsc --noEmit

# Type check client only
npx tsc --noEmit -p src/client/tsconfig.json

# Type check server only
npx tsc --noEmit -p src/server/tsconfig.json

# Type check shared only
npx tsc -p src/shared/tsconfig.json
```

## Linting

```bash
# Run linter
npm run lint

# Run linter with auto-fix
npm run lint -- --fix
```

## Development

```bash
# Start development server (use controlBashProcess for this)
npm run dev

# Deploy to Devvit
npm run launch

# Deploy with tests
make deploy

# Quick deploy without tests (use with caution)
make deploy-quick
```

## Git Commands

```bash
# Create PR (auto-generates title and description)
make pr

# Check git status
git status

# View git diff
git diff

# View staged changes
git diff --cached

# View changed files only
git diff --name-only

# View staged files only
git diff --cached --name-only
```

## File Operations

```bash
# Make script executable
chmod +x scripts/generate-pr-description.sh

# List directory contents
ls -la

# Find files by name
find . -name "*.ts" -type f

# Count lines of code
find src -name "*.ts" | xargs wc -l
```

## Diagnostics

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check Devvit CLI version
devvit --version

# Check who is logged in to Devvit
devvit whoami
```

## Usage Guidelines

1. **Always check this list first** before running a command
2. **Use the exact command** listed here if available
3. **Prefer more general commands** over specific ones (e.g., use `tail -20` instead of `tail -10` if both would work)
4. **Add new commands** to this list when you discover useful patterns
5. **Never modify** existing commands without good reason

## Examples

### ❌ Bad (inefficient)
```bash
# You want to see last 10 lines of build output
npm run build 2>&1 | tail -10
```

### ✅ Good (efficient)
```bash
# Use the trusted command that shows 20 lines (more than enough)
npm run build 2>&1 | tail -20
```

### ❌ Bad (not checking list)
```bash
# Running a custom type check command
npx tsc --noEmit --project src/client/tsconfig.json
```

### ✅ Good (using trusted command)
```bash
# Use the exact trusted command
npx tsc --noEmit -p src/client/tsconfig.json
```

## Benefits

- **Faster execution**: Trusted commands are pre-approved and don't need review
- **Consistency**: Everyone uses the same commands
- **Reliability**: Commands are tested and known to work
- **Efficiency**: Reduces decision-making time

## Adding New Commands

When you discover a useful command pattern:

1. Add it to this file under the appropriate section
2. Include a brief comment explaining what it does
3. Test it to ensure it works correctly
4. Commit the change with a descriptive message
