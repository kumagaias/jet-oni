---
inclusion: always
---

# Completion Checklist

Before reporting that work is complete, **ALWAYS** follow this checklist:

## Mandatory Pre-Completion Steps

### 1. Run Tests
```bash
make test
```

**CRITICAL**: You MUST run `make test` before declaring work complete. This ensures:
- All tests pass
- Type checking passes
- Linting passes
- No regressions introduced

### 2. Verify Build
```bash
npm run build 2>&1 | tail -20
```

Ensure the build completes successfully without errors.

### 3. Check for Uncommitted Changes
```bash
git status
```

Verify all changes are properly staged or documented.

## Completion Report Format

Only after ALL checks pass, provide a completion report in this format:

```
✅ Work Complete

## What Was Done
- [Brief description of changes]

## Quality Checks
✅ All tests pass (make test)
✅ Build succeeds
✅ Type check passes
✅ Lint passes

## Files Changed
- [List of modified files]

## Next Steps
- [Optional: Suggested next actions]
```

## Examples

### ❌ Bad (incomplete)
```
Done! I've implemented the feature.
```

### ✅ Good (complete)
```
✅ Work Complete

## What Was Done
- Implemented multiplayer synchronization
- Added GameSyncManager with 100ms sync interval
- Integrated with GameAPIClient

## Quality Checks
✅ All tests pass (561 tests)
✅ Build succeeds
✅ Type check passes
✅ Lint passes

## Files Changed
- src/client/sync/game-sync-manager.ts
- src/client/api/game-api-client.ts

## Next Steps
- Test in development environment with npm run dev
```

## When to Skip Tests

**NEVER**. Always run tests before completion.

The only exception is if:
1. The user explicitly says "skip tests"
2. You're in the middle of a multi-step process and haven't finished yet

## Handling Test Failures

If `make test` fails:

1. **DO NOT** report work as complete
2. **FIX** the failing tests
3. **RE-RUN** `make test`
4. **REPEAT** until all tests pass
5. **THEN** report completion

## Integration with Workflow

This checklist applies to:
- ✅ Task completion (from specs)
- ✅ Feature implementation
- ✅ Bug fixes
- ✅ Refactoring
- ✅ Any code changes

## Automation

Consider this checklist as a **pre-commit hook** in your workflow:

```
Work → Changes → make test → ✅ Pass → Report Complete
                           → ❌ Fail → Fix → Retry
```

## Benefits

- **Quality Assurance**: Catch issues before they're reported as done
- **Confidence**: User knows work is actually complete
- **Efficiency**: Avoid back-and-forth fixing issues later
- **Professionalism**: Deliver tested, working code

## Remember

🚨 **NEVER say "work is complete" without running `make test` first** 🚨
