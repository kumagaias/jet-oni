---
inclusion: always
---

# Git Workflow Guidelines

## Commit Message Language

- **ALWAYS write commit messages in English**
- **ALWAYS write PR titles and descriptions in English**
- Follow conventional commit format: `type(scope): description`

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

Good commit messages:
```
feat(game): add shared type definitions and constants
fix(player): correct fuel consumption calculation
docs(readme): update installation instructions
test(api): add unit tests for game state endpoints
```

Bad commit messages (avoid these):
```
feat: 共有型定義を追加  ❌ (Japanese)
update files  ❌ (Too vague)
fix stuff  ❌ (Not descriptive)
```

## Pull Request Guidelines

### PR Title Format

Use the same format as commit messages:
```
feat(scope): brief description of changes
```

### PR Description Template

```markdown
## Summary
Brief description of what this PR does

## Changes
- List of key changes
- Another change
- etc.

## Related Requirements
- Requirement 3.1, 3.2
- Requirement 4.2, 4.3

## Testing
- [ ] All tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)
```

## Automated PR Creation

When using `make pr`, the system will:
1. Run all tests to ensure code quality
2. Prompt for branch name (use kebab-case: `feat/feature-name`)
3. Prompt for PR title (use conventional commit format)
4. Auto-generate PR description based on changes
5. Create and push branch
6. Open PR against main branch

### Branch Naming Convention

- Feature branches: `feat/descriptive-name`
- Bug fixes: `fix/descriptive-name`
- Documentation: `docs/descriptive-name`
- Refactoring: `refactor/descriptive-name`

Examples:
```
feat/shared-types
fix/fuel-consumption
docs/api-documentation
refactor/player-movement
```

## Language Summary

| Item | Language |
|------|----------|
| Commit messages | English |
| PR titles | English |
| PR descriptions | English |
| Branch names | English |
| Code comments | English |
| Chat responses | Japanese |
| Spec documents | Japanese |
