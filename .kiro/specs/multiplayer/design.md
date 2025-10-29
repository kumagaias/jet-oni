# マルチプレイヤー機能 設計ドキュメント

## 概要

JET ONIゲームのマルチプレイヤー機能の技術設計。クライアント-サーバーアーキテクチャを使用し、Redisでゲーム状態を管理する。

## アーキテクチャ

### システム構成

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Client 1   │◄───────►│   Server    │◄───────►│    Redis    │
│  (Browser)  │         │  (Express)  │         │  (Storage)  │
└─────────────┘         └─────────────┘         └─────────────┘
       ▲                        ▲
       │                        │
       ▼                        ▼
┌─────────────┐         ┌─────────────┐
│  Client 2   │◄────────┤  Client 3   │
│  (Browser)  │         │  (Browser)  │
└─────────────┘         └─────────────┘
```

### データフロー

1. **ゲーム作成フロー**
   - Client → Server: POST /api/game/create
   - Server → Redis: ゲームセッション保存
   - Server → Client: ゲームID返却

2. **ゲーム参加フロー**
   - Client → Server: POST /api/game/join
   - Server → Redis: プレイヤー追加
   - Server → Client: 参加成功

3. **状態同期フロー（Devvit Realtime使用）**
   - Client: Realtimeチャンネル `game:{gameId}` に接続
   - Client → Realtime: プレイヤー状態をブロードキャスト
   - Realtime → All Clients: 全クライアントに即座に配信
   - Server: 定期的にRedisに状態を保存（永続化用）

## コンポーネント設計

### 1. GameAPI Client (クライアント側)

**責務**: サーバーAPIとの通信を管理

**主要メソッド**:
```typescript
class GameAPIClient {
  async createGame(config: GameConfig): Promise<CreateGameResponse>
  async joinGame(gameId: string, username: string): Promise<JoinGameResponse>
  async getGameState(gameId: string): Promise<GameState>
  async updatePlayerState(gameId: string, playerId: string, state: PlayerState): Promise<void>
  async endGame(gameId: string): Promise<EndGameResponse>
  async listGames(): Promise<GameListResponse>
}
```

**エラーハンドリング**:
- ネットワークエラー: 3回リトライ
- タイムアウト: 5秒
- サーバーエラー: エラーメッセージ表示

### 2. RealtimeSyncManager (クライアント側)

**責務**: Devvit Realtimeを使用したゲーム状態の同期

**主要メソッド**:
```typescript
class RealtimeSyncManager {
  async connect(gameId: string, playerId: string): Promise<void>
  async disconnect(): Promise<void>
  sendPlayerState(state: PlayerState): void
  onRemotePlayerUpdate(callback: (players: Player[]) => void): void
  onConnect(callback: () => void): void
  onDisconnect(callback: () => void): void
}
```

**同期戦略**:
- イベント駆動: 状態変更時のみ送信
- ほぼゼロレイテンシ: Realtimeで即座に配信
- 補間: 線形補間で滑らかに表示
- 自動再接続: 切断時に自動的に再接続

### 3. LobbyManager (クライアント側)

**責務**: ロビー画面の管理

**主要メソッド**:
```typescript
class LobbyManager {
  showLobby(gameId: string, isHost: boolean): void
  updatePlayerList(players: Player[]): void
  startCountdown(): void
  onGameStart(callback: () => void): void
}
```

**機能**:
- プレイヤーリスト表示
- リアルタイム更新
- カウントダウン
- ホストによる早期開始

### 4. GameManager (サーバー側)

**責務**: ゲームセッションの管理

**主要メソッド**:
```typescript
class GameManager {
  createGame(hostId: string, config: GameConfig): GameState
  joinGame(gameId: string, playerId: string, username: string): boolean
  updatePlayerState(gameId: string, playerId: string, state: PlayerState): void
  getGameState(gameId: string): GameState | null
  endGame(gameId: string): GameState | null
  listGames(): GameState[]
}
```

**データ構造**:
```typescript
interface GameState {
  gameId: string
  hostId: string
  status: 'lobby' | 'playing' | 'ended'
  config: GameConfig
  players: Player[]
  startTime: number
  endTime: number
}
```

### 5. RedisStorage (サーバー側)

**責務**: Redisへのデータ永続化

**主要メソッド**:
```typescript
class RedisStorage {
  async saveGame(gameId: string, gameState: GameState): Promise<void>
  async getGame(gameId: string): Promise<GameState | null>
  async updatePlayer(gameId: string, playerId: string, state: PlayerState): Promise<void>
  async deleteGame(gameId: string): Promise<void>
  async listGames(): Promise<GameState[]>
}
```

**Redisキー設計**:
- `game:{gameId}`: ゲーム状態 (TTL: 1時間)
- `game:{gameId}:players`: プレイヤーリスト (TTL: 1時間)
- `games:active`: アクティブなゲームIDのセット (TTL: 1時間)

## データモデル

### GameState
```typescript
interface GameState {
  gameId: string              // ゲームID (UUID)
  hostId: string              // ホストのプレイヤーID
  status: GameStatus          // 'lobby' | 'playing' | 'ended'
  config: GameConfig          // ゲーム設定
  players: Player[]           // プレイヤーリスト
  startTime: number           // 開始時刻 (Unix timestamp)
  endTime: number             // 終了時刻 (Unix timestamp)
  currentRound: number        // 現在のラウンド
  timeRemaining: number       // 残り時間 (秒)
}
```

### Player
```typescript
interface Player {
  id: string                  // プレイヤーID
  username: string            // ユーザー名
  isOni: boolean              // 鬼フラグ
  isAI: boolean               // AIフラグ
  position: Vector3           // 位置
  velocity: Vector3           // 速度
  rotation: Rotation          // 回転
  fuel: number                // 燃料
  survivedTime: number        // 生存時間
  wasTagged: boolean          // タグ付けされたフラグ
  isOnSurface: boolean        // 地面にいるフラグ
  isDashing: boolean          // ダッシュ中フラグ
  isJetpacking: boolean       // ジェットパック中フラグ
  beaconCooldown: number      // ビーコンクールダウン
  lastUpdate: number          // 最終更新時刻
}
```

## API設計

### POST /api/game/create
ゲームセッションを作成

**Request**:
```typescript
{
  config: {
    totalPlayers: number      // 4-20
    roundDuration: number     // 180 or 300
    rounds: number            // 1, 3, or 5
  }
}
```

**Response**:
```typescript
{
  success: boolean
  gameId?: string
  gameState?: GameState
  error?: string
}
```

### POST /api/game/join
ゲームに参加

**Request**:
```typescript
{
  gameId: string
  username: string
}
```

**Response**:
```typescript
{
  success: boolean
  playerId?: string
  gameState?: GameState
  error?: string
}
```

### GET /api/game/:id
ゲーム状態を取得

**Response**:
```typescript
{
  success: boolean
  gameState?: GameState
  error?: string
}
```

### POST /api/game/:id/update
プレイヤー状態を更新

**Request**:
```typescript
{
  playerId: string
  state: {
    position: Vector3
    velocity: Vector3
    rotation: Rotation
    fuel: number
    isOni: boolean
    isDashing: boolean
    isJetpacking: boolean
  }
}
```

**Response**:
```typescript
{
  success: boolean
  error?: string
}
```

### GET /api/game/list
参加可能なゲームリストを取得

**Response**:
```typescript
{
  success: boolean
  games?: GameState[]
  error?: string
}
```

## 同期戦略（Devvit Realtime使用）

### クライアント側

1. **Realtime接続**
   - ゲーム開始時にチャンネル `game:{gameId}` に接続
   - `connectRealtime()` を使用

2. **状態送信** (イベント駆動)
   - プレイヤーが移動したときのみ送信
   - スロットリング: 最大60回/秒
   - メッセージ形式:
     ```typescript
     {
       type: 'player-update',
       playerId: string,
       position: Vector3,
       velocity: Vector3,
       rotation: Rotation,
       fuel: number,
       isOni: boolean,
       timestamp: number
     }
     ```

3. **状態受信** (onMessageハンドラ)
   - Realtimeから他のプレイヤーの状態を受信
   - 即座にゲーム状態を更新
   - 補間で滑らかに表示

4. **接続管理**
   - `onConnect`: 接続確立時に初期状態を送信
   - `onDisconnect`: 切断時に再接続を試みる
   - 自動再接続: 最大3回リトライ

### サーバー側

1. **Realtimeメッセージ配信**
   - クライアントからのメッセージを全クライアントに配信
   - Devvit Realtimeが自動的に処理

2. **状態永続化** (オプション)
   - 定期的にRedisに状態を保存
   - ゲーム終了時の結果計算用
   - TTLを設定してメモリ管理

3. **状態検証** (サーバー側エンドポイント)
   - 重要な状態変更（鬼になる、タグ付けなど）はサーバー側で検証
   - `/api/game/:id/tag` エンドポイントで処理

## パフォーマンス最適化

### Realtime最適化
- **イベント駆動**: 変更時のみ送信（HTTPポーリングより80%削減）
- **スロットリング**: 最大60回/秒に制限
- **差分送信**: 変化がない場合はスキップ
- **ほぼゼロレイテンシ**: Realtimeで即座に配信

### データ圧縮
- 位置: Float32 (4 bytes) × 3 = 12 bytes
- 速度: Float32 (4 bytes) × 3 = 12 bytes
- 回転: Float32 (4 bytes) × 2 = 8 bytes
- 合計: 約32 bytes/player

### Redis最適化
- パイプライン処理
- TTL設定でメモリ管理
- インデックス最適化

## エラーハンドリング

### ネットワークエラー
- 3回リトライ
- 指数バックオフ (1s, 2s, 4s)
- 失敗時はエラーメッセージ表示

### サーバーエラー
- エラーコードに応じた処理
- 400: バリデーションエラー → メッセージ表示
- 404: ゲームが見つからない → タイトル画面に戻る
- 500: サーバーエラー → リトライ

### クライアント切断
- タイムアウト検出 (10秒)
- AIプレイヤーに置き換え
- 他のプレイヤーに通知

## Realtime実装詳細

### クライアント側実装

```typescript
import { connectRealtime } from '@devvit/web/client';

class RealtimeSyncManager {
  private connection: RealtimeConnection | null = null;
  private gameId: string | null = null;
  private playerId: string | null = null;
  
  async connect(gameId: string, playerId: string): Promise<void> {
    this.gameId = gameId;
    this.playerId = playerId;
    
    this.connection = await connectRealtime({
      channel: `game:${gameId}`,
      onConnect: (channel) => {
        console.log(`Connected to ${channel}`);
        // 初期状態を送信
        this.sendInitialState();
      },
      onDisconnect: (channel) => {
        console.log(`Disconnected from ${channel}`);
        // 再接続を試みる
        this.reconnect();
      },
      onMessage: (data) => {
        // 他のプレイヤーの状態を処理
        this.handleRemotePlayerUpdate(data);
      },
    });
  }
  
  sendPlayerState(state: PlayerState): void {
    if (!this.connection) return;
    
    const message = {
      type: 'player-update',
      playerId: this.playerId,
      ...state,
      timestamp: Date.now(),
    };
    
    // Realtimeチャンネルに送信（全クライアントに配信される）
    this.connection.send(message);
  }
}
```

### サーバー側実装

```typescript
import { realtime } from '@devvit/web/server';

// サーバー側からメッセージを送信する場合（オプション）
async function broadcastGameEvent(gameId: string, event: GameEvent) {
  await realtime.send(`game:${gameId}`, {
    type: 'game-event',
    event,
    timestamp: Date.now(),
  });
}

// 例: 鬼の割り当てをサーバー側で処理
router.post('/api/game/:id/assign-oni', async (req, res) => {
  const { id } = req.params;
  const { playerId } = req.body;
  
  // ゲーム状態を更新
  await gameManager.assignOni(id, playerId);
  
  // Realtimeで全クライアントに通知
  await realtime.send(`game:${id}`, {
    type: 'oni-assigned',
    playerId,
    timestamp: Date.now(),
  });
  
  res.json({ success: true });
});
```

## セキュリティ

### 入力検証
- サーバー側で全ての入力を検証
- 位置、速度の範囲チェック
- 不正な値は補正

### レート制限
- Realtimeメッセージ: 60回/秒/ユーザー（クライアント側でスロットリング）
- API呼び出し: 10回/秒/ユーザー

### 認証
- Devvitの認証機能を使用
- Redditユーザー情報で識別
- Realtimeチャンネルはゲーム参加者のみアクセス可能

## テスト戦略

### 単体テスト
- GameAPIClient
- GameSyncManager
- GameManager
- RedisStorage

### 統合テスト
- API エンドポイント
- クライアント-サーバー通信
- Redis操作

### E2Eテスト
- ゲーム作成から終了まで
- 複数プレイヤーの同期
- エラーハンドリング
