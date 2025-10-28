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

3. **状態同期フロー**
   - Client → Server: POST /api/game/update (自分の状態)
   - Server → Redis: 状態保存
   - Client → Server: GET /api/game/:id (全プレイヤーの状態)
   - Server → Redis: 状態取得
   - Server → Client: 全プレイヤーの状態返却

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

### 2. GameSyncManager (クライアント側)

**責務**: ゲーム状態のリアルタイム同期

**主要メソッド**:
```typescript
class GameSyncManager {
  startSync(gameId: string, playerId: string): void
  stopSync(): void
  sendPlayerState(state: PlayerState): void
  onRemotePlayerUpdate(callback: (players: Player[]) => void): void
}
```

**同期戦略**:
- 送信頻度: 100ms (10Hz)
- 受信頻度: 100ms (10Hz)
- 補間: 線形補間で滑らかに表示
- 予測: クライアント側で位置を予測

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

## 同期戦略

### クライアント側

1. **送信ループ** (100ms間隔)
   - 自分の状態をサーバーに送信
   - 位置、速度、回転、燃料など

2. **受信ループ** (100ms間隔)
   - サーバーから全プレイヤーの状態を取得
   - リモートプレイヤーの位置を更新

3. **補間**
   - 受信した位置と現在の位置を線形補間
   - 滑らかな動きを実現

4. **予測**
   - ネットワーク遅延を考慮して位置を予測
   - 速度ベクトルから次の位置を計算

### サーバー側

1. **状態検証**
   - クライアントから受信した状態を検証
   - 異常な速度や位置を補正

2. **状態保存**
   - Redisに状態を保存
   - TTLを設定してメモリ管理

3. **状態配信**
   - クライアントからのリクエストに応じて状態を返却
   - 最新の状態のみ返却

## パフォーマンス最適化

### データ圧縮
- 位置: Float32 (4 bytes) × 3 = 12 bytes
- 速度: Float32 (4 bytes) × 3 = 12 bytes
- 回転: Float32 (4 bytes) × 2 = 8 bytes
- 合計: 約32 bytes/player

### ネットワーク最適化
- 差分のみ送信
- 変化がない場合はスキップ
- バッチ処理で複数プレイヤーをまとめて送信

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

## セキュリティ

### 入力検証
- サーバー側で全ての入力を検証
- 位置、速度の範囲チェック
- 不正な値は補正

### レート制限
- API呼び出し: 100回/秒/ユーザー
- 状態更新: 20回/秒/ユーザー

### 認証
- Devvitの認証機能を使用
- Redditユーザー情報で識別

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
