# 設計ドキュメント

## 概要

JetOniは、Three.jsを使用した3Dマルチプレイヤー鬼ごっこゲームで、Devvitプラットフォーム上で動作します。クライアント側でThree.jsによる3Dレンダリングを行い、サーバー側でゲーム状態管理とReddit統合を処理します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    Reddit Platform                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Devvit Post (Webview)                │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         Client (Three.js Game)              │  │  │
│  │  │  - 3D Rendering                             │  │  │
│  │  │  - Player Input                             │  │  │
│  │  │  - Game Loop                                │  │  │
│  │  │  - UI Components                            │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                      ↕ fetch                      │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         Server (Express API)                │  │  │
│  │  │  - Game State Management                    │  │  │
│  │  │  - Player Management                        │  │  │
│  │  │  - Statistics Storage (Redis)               │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技術スタック

- **クライアント**: Three.js, TypeScript, Vite
- **サーバー**: Express, TypeScript, Devvit SDK
- **データストレージ**: Redis (Devvit提供)
- **ビルドツール**: Vite (クライアント・サーバー両方)

## コンポーネントとインターフェース

### クライアント側コンポーネント

#### 1. ゲームエンジン (`src/client/game/`)

**game-engine.ts** (< 500行)
- ゲームループの管理
- Three.jsシーンの初期化
- レンダリングパイプライン

**game-state.ts** (< 500行)
- ローカルゲーム状態の管理
- プレイヤー状態（位置、速度、燃料）
- ゲームフェーズ（ロビー、プレイ中、終了）

#### 2. プレイヤーシステム (`src/client/player/`)

**player-controller.ts** (< 500行)
- プレイヤー入力処理
- 移動ロジック
- 能力の起動（ジェットパック、ダッシュ）

**player-physics.ts** (< 500行)
- 物理演算（重力、速度）
- 衝突判定
- 屋上着地判定

**player-camera.ts** (< 500行)
- カメラ制御（一人称・三人称）
- マウスルック
- カメラスムージング

#### 3. AI システム (`src/client/ai/`)

**ai-controller.ts** (< 500行)
- AI意思決定ロジック
- ターゲット選択
- 能力使用判断

**ai-behavior.ts** (< 500行)
- 追跡行動
- 逃走行動
- 徘徊行動

#### 4. 環境システム (`src/client/environment/`)

**city-generator.ts** (< 500行)
- 都市マップ生成
- 建物配置
- 道路・川の生成

**collision-system.ts** (< 500行)
- 建物との衝突判定
- 車・歩行者との衝突
- 水中判定

**dynamic-objects.ts** (< 500行)
- 車の移動
- 歩行者のアニメーション
- はしごシステム

#### 5. UIシステム (`src/client/ui/`)

**ui-manager.ts** (< 500行)
- UI全体の管理
- 画面遷移

**ui-hud.ts** (< 500行)
- ゲーム中のHUD表示
- タイマー、プレイヤーカウント
- 燃料ゲージ

**ui-menu.ts** (< 500行)
- タイトル画面
- ゲーム設定
- ゲームリスト

**ui-results.ts** (< 500行)
- 結果画面
- 統計表示

**ui-controls.ts** (< 500行)
- モバイルコントロール
- タッチボタン

#### 6. ビジュアルエフェクト (`src/client/effects/`)

**particle-system.ts** (< 500行)
- ジェットパックの炎
- ダッシュエフェクト

**visual-indicators.ts** (< 500行)
- プレイヤーマーカー
- ビーコンビーム
- スポットインジケーター

**beacon-visual.ts** (< 500行)
- ビーコンアイテムのビジュアル
- 回転アニメーション
- ビーコン起動時のエフェクト

#### 7. アイテムシステム (`src/client/items/`)

**beacon-item.ts** (< 500行)
- ビーコンアイテムの配置
- アイテム取得判定
- アイテムの状態管理

**item-manager.ts** (< 500行)
- アイテム全体の管理
- アイテムの生成・削除

#### 7. 多言語対応 (`src/client/i18n/`)

**i18n.ts** (< 500行)
- 翻訳システム
- 言語切り替え

**translations/en.ts** (< 500行)
- 英語翻訳

**translations/jp.ts** (< 500行)
- 日本語翻訳

### サーバー側コンポーネント

#### 1. APIエンドポイント (`src/server/api/`)

**game-api.ts** (< 500行)
- ゲーム作成・参加
- ゲーム状態取得
- ゲーム終了

**stats-api.ts** (< 500行)
- 統計の保存・取得
- リーダーボード

#### 2. ゲーム管理 (`src/server/core/`)

**game-manager.ts** (< 500行)
- ゲームセッション管理
- プレイヤー管理
- 鬼の割り当て

**redis-storage.ts** (< 500行)
- Redisへのデータ保存
- データ取得・更新

### 共有コンポーネント (`src/shared/`)

**types/game.ts** (< 500行)
- ゲーム状態の型定義
- プレイヤー状態の型定義

**types/api.ts** (< 500行)
- APIリクエスト・レスポンスの型定義

**constants.ts** (< 500行)
- ゲーム定数（速度、燃料消費率など）

## データモデル

### ゲーム状態

```typescript
interface GameState {
  gameId: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'ended';
  config: GameConfig;
  players: Player[];
  startTime: number;
  endTime: number;
}

interface GameConfig {
  totalPlayers: number;
  roundDuration: number; // seconds
  rounds: number;
}

interface Player {
  id: string;
  username: string;
  isOni: boolean;
  isAI: boolean;
  position: Vector3;
  velocity: Vector3;
  fuel: number;
  survivedTime: number;
  wasTagged: boolean;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

### 統計データ

```typescript
interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalSurvivalTime: number;
  longestSurvival: number;
}
```

### Redis キー構造

```
game:{gameId}                    - ゲーム状態
game:{gameId}:players            - プレイヤーリスト
stats:{userId}                   - プレイヤー統計
games:active                     - アクティブなゲームのリスト
```

## エラーハンドリング

### クライアント側

1. **ネットワークエラー**
   - APIリクエスト失敗時にリトライ（最大3回）
   - ユーザーにエラーメッセージを表示

2. **レンダリングエラー**
   - Three.jsの初期化失敗時にフォールバック画面を表示
   - WebGL非対応ブラウザの検出

3. **入力エラー**
   - 無効な入力を無視
   - ポインターロック失敗時の処理

### サーバー側

1. **Redis接続エラー**
   - 接続失敗時にリトライ
   - エラーログの記録

2. **無効なリクエスト**
   - バリデーションエラーを返す（400）
   - 適切なエラーメッセージ

3. **ゲーム状態エラー**
   - 存在しないゲームへのアクセス（404）
   - 満員のゲームへの参加試行（409）

## テスト戦略

### 単体テスト

#### クライアント側

1. **ゲームロジック**
   - プレイヤー移動計算
   - 衝突判定アルゴリズム
   - AI意思決定ロジック

2. **UI コンポーネント**
   - 状態更新の正確性
   - イベントハンドリング

3. **多言語対応**
   - 翻訳キーの存在確認
   - パラメータ置換

#### サーバー側

1. **API エンドポイント**
   - リクエスト・レスポンスの検証
   - エラーハンドリング

2. **ゲーム管理**
   - 鬼の割り当てロジック
   - ゲーム終了条件

3. **データストレージ**
   - Redis操作のモック
   - データの整合性

### 統合テスト

1. **クライアント-サーバー通信**
   - APIエンドポイントの呼び出し
   - データの送受信

2. **ゲームフロー**
   - ロビー → ゲーム開始 → ゲーム終了
   - プレイヤー参加・退出

### テストツール

- **単体テスト**: Vitest
- **モック**: Vitest のモック機能
- **カバレッジ**: Vitest カバレッジレポート

## パフォーマンス最適化

### クライアント側

1. **レンダリング最適化**
   - フラスタムカリング（Three.js標準）
   - LOD（Level of Detail）は不要（マップサイズが小さい）
   - シャドウマップの解像度調整

2. **物理演算最適化**
   - 衝突判定の空間分割（必要に応じて）
   - 遠くのAIの更新頻度を下げる

3. **メモリ管理**
   - パーティクルのオブジェクトプール
   - 不要なオブジェクトの破棄

### サーバー側

1. **Redis最適化**
   - バッチ操作の使用
   - 適切なTTL設定

2. **API最適化**
   - レスポンスのキャッシング（必要に応じて）
   - 不要なデータの送信を避ける

## セキュリティ考慮事項

1. **入力検証**
   - クライアントからの全入力を検証
   - SQLインジェクション対策（Redisは影響なし）

2. **認証**
   - Devvitの自動認証を使用
   - ユーザーIDの検証

3. **レート制限**
   - API呼び出しの頻度制限（必要に応じて）

## デプロイメント

### ビルドプロセス

1. **クライアントビルド**
   ```bash
   npm run build:client
   ```
   - `dist/client/` に出力
   - HTML、CSS、JSバンドル

2. **サーバービルド**
   ```bash
   npm run build:server
   ```
   - `dist/server/` に出力
   - CommonJS形式

3. **統合ビルド**
   ```bash
   npm run build
   ```
   - クライアントとサーバーの両方をビルド

### デプロイフロー

```bash
make deploy
```

1. 全テストを実行
2. テスト成功を確認
3. git add & commit
4. git push
5. devvit upload

## 開発ワークフロー

### ローカル開発

```bash
npm run dev
```

- クライアント、サーバー、Devvitを並行実行
- ホットリロード有効

### テスト実行

```bash
npm test
```

- 全単体テストを実行
- カバレッジレポート生成

### コード品質チェック

```bash
npm run check
```

- ESLint
- TypeScript型チェック
- Prettier

## 今後の拡張性

### 将来的な機能追加

1. **マルチプレイヤー対応**
   - Devvit Realtime APIの統合
   - リアルタイム同期

2. **追加のゲームモード**
   - チーム戦
   - タイムアタック

3. **カスタマイズ**
   - プレイヤースキン
   - マップ選択

4. **ソーシャル機能**
   - フレンド招待
   - リプレイ共有

### 拡張のための設計

- モジュラーアーキテクチャ
- 明確なインターフェース定義
- プラグイン可能なシステム
