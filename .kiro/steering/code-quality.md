---
inclusion: always
---

# Code Quality Guidelines

## File Size Limits

- **Maximum file size**: 500 lines per file
- **Action required**: If a file exceeds 500 lines, split it into multiple files
- **Rationale**: Smaller files are easier to maintain, test, and understand

### How to Split Files

When a file exceeds 500 lines:

1. **Identify logical boundaries**: Group related functions, classes, or components
2. **Create separate files**: Extract groups into their own files
3. **Use clear naming**: File names should reflect their contents
4. **Maintain imports**: Update import statements in all affected files

### Examples

- Split large game logic into: `game-state.ts`, `game-physics.ts`, `game-ai.ts`
- Split UI components into: `ui-hud.ts`, `ui-menu.ts`, `ui-controls.ts`
- Split utilities into: `collision-utils.ts`, `math-utils.ts`, `animation-utils.ts`

## Testing Requirements

### Test Coverage

- **Write tests for all new features**: Every new feature must have corresponding tests
- **Test core functionality**: Focus on critical game logic, API endpoints, and data operations
- **Keep tests minimal**: Test essential behavior, avoid over-testing edge cases

### Test Organization

- **Co-locate tests**: Place test files next to the code they test
- **Naming convention**: Use `.test.ts` or `.spec.ts` suffix
- **Test file structure**: Mirror the structure of source files

### Test Types

1. **Unit tests**: Test individual functions and classes in isolation
2. **Integration tests**: Test how components work together
3. **API tests**: Test server endpoints and responses

### Testing Best Practices

- **Test behavior, not implementation**: Focus on what the code does, not how it does it
- **Use descriptive test names**: Test names should clearly describe what is being tested
- **Keep tests simple**: Each test should verify one specific behavior
- **Avoid test duplication**: Don't test the same thing multiple times
- **Mock external dependencies**: Use mocks for Redis, Reddit API, etc.

### Example Test Structure

```typescript
describe('GameState', () => {
  describe('assignOni', () => {
    it('should randomly assign one player as oni', () => {
      // Test implementation
    });
    
    it('should mark all other players as runners', () => {
      // Test implementation
    });
  });
});
```

## Code Organization

### Module Structure

- **Single responsibility**: Each file should have one clear purpose
- **Logical grouping**: Group related functionality together
- **Clear dependencies**: Make dependencies explicit through imports
- **Avoid circular dependencies**: Structure code to prevent circular imports

### Naming Conventions

- **Files**: Use kebab-case for file names (e.g., `game-state.ts`)
- **Classes**: Use PascalCase (e.g., `GameState`)
- **Functions**: Use camelCase (e.g., `assignRandomOni`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_PLAYERS`)

## Documentation

### Code Comments

- **Document complex logic**: Add comments for non-obvious code
- **Explain "why", not "what"**: Comments should explain reasoning, not repeat code
- **Keep comments updated**: Update comments when code changes
- **Use JSDoc for public APIs**: Document function parameters and return values

### README Files

- **Project overview**: Explain what the project does
- **Setup instructions**: How to install and run the project
- **Development guide**: How to contribute and test changes
- **API documentation**: Document available endpoints and their usage
