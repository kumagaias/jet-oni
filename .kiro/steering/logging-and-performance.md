# ログとパフォーマンスのガイドライン

## 重要な原則

**ログの過剰な出力は、APIのレート制限やBANの原因になります。特にDevvit環境では注意が必要です。**

## ログ出力の禁止事項

### ❌ 絶対にやってはいけないこと

1. **高頻度コールバック内でのログ出力**
   ```typescript
   // ❌ 悪い例：毎フレーム実行される（60回/秒）
   gameLoop(() => {
     console.log('Game loop running');
   });
   
   // ❌ 悪い例：リアルタイム同期コールバック
   realtimeSyncManager.onRemotePlayerUpdate((players) => {
     console.log('Synced players:', players.length);
   });
   
   // ❌ 悪い例：アニメーションフレーム内
   requestAnimationFrame(() => {
     console.log('Frame rendered');
   });
   ```

2. **ループ内での無条件ログ**
   ```typescript
   // ❌ 悪い例：大量のログが出力される
   for (const player of players) {
     console.log('Processing player:', player.id);
   }
   ```

3. **イベントハンドラ内での無条件ログ**
   ```typescript
   // ❌ 悪い例：マウス移動で大量のログ
   window.addEventListener('mousemove', (e) => {
     console.log('Mouse position:', e.x, e.y);
   });
   ```

## ログ出力のベストプラクティス

### ✅ 推奨される方法

1. **スロットリング（時間制限）**
   ```typescript
   // ✅ 良い例：5秒に1回だけログ出力
   let lastLogTime = 0;
   realtimeSyncManager.onRemotePlayerUpdate((players) => {
     const now = Date.now();
     if (now - lastLogTime > 5000) {
       console.log('Synced players:', players.length);
       lastLogTime = now;
     }
   });
   ```

2. **条件付きログ（開発環境のみ）**
   ```typescript
   // ✅ 良い例：開発環境でのみログ出力
   const isDev = import.meta.env.DEV;
   
   if (isDev) {
     console.log('Debug info:', data);
   }
   ```

3. **重要なイベントのみログ出力**
   ```typescript
   // ✅ 良い例：状態変化時のみログ
   let previousState = null;
   gameLoop(() => {
     const currentState = gameState.getPhase();
     if (currentState !== previousState) {
       console.log('Game phase changed:', currentState);
       previousState = currentState;
     }
   });
   ```

4. **カウンター方式**
   ```typescript
   // ✅ 良い例：100回に1回だけログ
   let frameCount = 0;
   gameLoop(() => {
     frameCount++;
     if (frameCount % 100 === 0) {
       console.log('Frame:', frameCount);
     }
   });
   ```

## デバッグログの管理

### デバッグログの追加時

1. **実行頻度を必ず確認**
   - どのコールバック/関数内に追加するか
   - 1秒間に何回実行されるか
   - 1分間で何回実行されるか

2. **一時的なログには明確なマーク**
   ```typescript
   // TODO: Remove debug log before commit
   console.log('[DEBUG]', data);
   ```

3. **コミット前に必ず削除**
   - デバッグログは本番コードに残さない
   - コミット前に`git diff`で確認

### 本番環境でのログ

本番環境では以下のログのみ許可：

- **エラーログ**: `console.error()`
- **警告ログ**: `console.warn()`
- **重要なイベント**: ゲーム開始、終了、接続、切断など

```typescript
// ✅ 本番環境で許可されるログ
console.error('Failed to connect to server:', error);
console.warn('Player disconnected:', playerId);
console.log('Game started'); // 1回だけ実行されるイベント
```

## パフォーマンスに関する注意事項

### 高頻度実行される場所

以下の場所では特に注意が必要：

1. **ゲームループ** (60回/秒)
2. **アニメーションフレーム** (60回/秒)
3. **リアルタイム同期コールバック** (頻繁)
4. **マウス/タッチイベント** (非常に頻繁)
5. **スクロールイベント** (非常に頻繁)

### パフォーマンス測定

パフォーマンスを測定する場合は、適切な方法を使用：

```typescript
// ✅ 良い例：パフォーマンス測定
const startTime = performance.now();
// 処理
const endTime = performance.now();
if (endTime - startTime > 16) { // 16ms = 60FPS
  console.warn('Slow operation:', endTime - startTime, 'ms');
}
```

## チェックリスト

コミット前に以下を確認：

- [ ] `console.log`が高頻度コールバック内にないか
- [ ] デバッグ用の一時的なログを削除したか
- [ ] ループ内に無条件のログがないか
- [ ] イベントハンドラ内のログにスロットリングがあるか
- [ ] 本番環境で不要なログがないか

## 違反例と修正例

### 例1: リアルタイム同期

```typescript
// ❌ 違反例
realtimeSyncManager.onRemotePlayerUpdate((players) => {
  console.log('Synced players:', players.length); // 毎フレーム実行
  for (const player of players) {
    gameState.updateRemotePlayer(player);
  }
});

// ✅ 修正例
realtimeSyncManager.onRemotePlayerUpdate((players) => {
  // ログは削除または条件付きに
  for (const player of players) {
    gameState.updateRemotePlayer(player);
  }
});
```

### 例2: ゲームループ

```typescript
// ❌ 違反例
function gameLoop(deltaTime: number) {
  console.log('Delta time:', deltaTime); // 60回/秒
  updateGame(deltaTime);
  render();
}

// ✅ 修正例
let frameCount = 0;
function gameLoop(deltaTime: number) {
  frameCount++;
  // 5秒に1回だけログ（60fps × 5秒 = 300フレーム）
  if (frameCount % 300 === 0) {
    console.log('Average delta time:', deltaTime);
  }
  updateGame(deltaTime);
  render();
}
```

### 例3: プレイヤー処理

```typescript
// ❌ 違反例
function updatePlayers(players: Player[]) {
  console.log('Updating players:', players.length); // 毎フレーム
  for (const player of players) {
    console.log('Player position:', player.position); // 大量のログ
    updatePlayerPosition(player);
  }
}

// ✅ 修正例
function updatePlayers(players: Player[]) {
  // ログは削除
  for (const player of players) {
    updatePlayerPosition(player);
  }
}
```

## まとめ

- **高頻度実行される場所では絶対にログを出力しない**
- **デバッグログは一時的なもの、コミット前に必ず削除**
- **本番環境ではエラーと重要なイベントのみログ出力**
- **疑わしい場合はスロットリングを使用**
- **コミット前に必ず`git diff`で確認**

これらのガイドラインを守ることで、APIのレート制限やBANを回避し、パフォーマンスの良いアプリケーションを維持できます。
