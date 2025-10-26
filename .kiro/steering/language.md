# Language Guidelines

## Communication Language Rules

- **Chat responses**: Always respond in Japanese (日本語)
- **Documentation in .kiro folder**: Write in Japanese (日本語)
  - This includes: specs, requirements, design documents, tasks, steering files
  - Exception: Code examples within documentation should be in English
- **All code deliverables**: Write in English
- **Code comments**: Write in English
- **Variable/function names**: Write in English
- **README files**: Write in English
- **API documentation**: Write in English
- **Error messages in code**: Write in English

## Summary

- Internal communication (chat, .kiro docs, specs) = Japanese
- All code and technical deliverables = English

## Examples

### Correct: .kiro/specs/feature/requirements.md
```markdown
# 要件ドキュメント

## 概要

この機能は...

## 用語集

- **システム**: アプリケーション本体
- **ユーザー**: アプリを使用する人

## 要件

### 要件1: ユーザー認証

**ユーザーストーリー:** ユーザーとして、ログインしたい。

#### 受入基準

1. WHEN ユーザーがログインボタンを押す, THE システム SHALL 認証画面を表示する
```

### Correct: src/auth.ts
```typescript
// Authenticate user with Reddit
export function authenticateUser(username: string): Promise<User> {
  // Implementation in English
}
```
