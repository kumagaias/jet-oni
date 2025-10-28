/**
 * Japanese translations for JetOni game
 */

import type { Translations } from '../i18n';

export const jp: Translations = {
  // メニュー画面
  menu: {
    title: 'ジェットオニ',
    subtitle: '3D鬼ごっこゲーム',
    createGame: 'ゲーム作成',
    joinGame: 'ゲーム参加',
    statistics: '統計',
    settings: '設定',
    languageSelect: '言語',
    back: '戻る',
  },

  // ゲーム設定
  settings: {
    title: 'ゲーム設定',
    players: 'プレイヤー数',
    duration: '時間',
    rounds: 'ラウンド数',
    minutes: '{value}分',
    confirm: 'ゲーム開始',
    playerCount: '{count}人',
  },

  // ゲームリスト
  gameList: {
    title: '利用可能なゲーム',
    noGames: 'ゲームがありません',
    join: '参加',
    full: '満員',
    players: '{current}/{max}',
    duration: '{minutes}分',
    rounds: '{count}ラウンド',
  },

  // ロビー
  lobby: {
    title: 'ロビー',
    waiting: 'プレイヤーを待っています...',
    players: 'プレイヤー: {current}/{max}',
    pressSpace: 'SPACEキーで開始',
    addingAI: 'AIプレイヤーを追加中...',
    ready: '準備完了！',
  },

  // ゲームHUD
  hud: {
    timer: '残り時間: {time}',
    oni: '鬼',
    runners: '逃げる側',
    fuel: '燃料',
    status: {
      oni: 'あなたは鬼です',
      runner: 'あなたは逃げる側です',
    },
    playerCount: '鬼: {oni} | 逃げる側: {runners}',
    beacon: 'ビーコン',
    beaconReady: 'ビーコン使用可能',
    beaconCooldown: 'ビーコン: {seconds}秒',
  },

  // コントロール
  controls: {
    movement: '移動',
    wasd: 'WASD - 移動',
    mouse: 'マウス - 視点',
    space: 'SPACE - ジャンプ/ジェットパック',
    shift: 'SHIFT - ダッシュ',
    esc: 'ESC - メニュー',
    abilities: '能力',
    jetpack: 'ジェットパック（鬼）',
    jump: 'ジャンプ（逃げる側）',
    dash: 'ダッシュ（逃げる側）',
    beacon: 'ビーコン（鬼）',
  },

  // モバイルコントロール
  mobile: {
    dash: 'ダッシュ',
    jetpack: 'ジェットパック',
    beacon: 'ビーコン',
  },

  // ゲームメッセージ
  game: {
    becameOni: '鬼になった！',
    tagged: '{player}をタグ付けした！',
    gotTagged: '{player}にタグ付けされた！',
    spotted: '見つかった！',
    beaconActivated: 'ビーコン起動！',
    outOfFuel: '燃料切れ！',
    gameStarting: 'ゲーム開始...',
    roundStarting: 'ラウンド{round}開始...',
    getReady: '準備してください！',
    notifications: {
      becameOni: '鬼になった！',
      taggedPlayer: '{player}をタグ付けした！',
    },
  },

  // 結果画面
  results: {
    title: 'ゲーム結果',
    winner: '勝者！',
    survived: '生存',
    tagged: 'タグ付けされた',
    survivalTime: '生存時間: {time}',
    longestSurvival: '最長生存',
    escaped: '逃げ切った！',
    caught: '捕まった',
    rank: '順位',
    player: 'プレイヤー',
    time: '時間',
    status: 'ステータス',
    backToMenu: 'メニューに戻る',
    nextRound: '次のラウンド',
  },

  // 統計
  stats: {
    title: '統計',
    gamesPlayed: 'プレイ回数',
    wins: '勝利',
    losses: '敗北',
    winRate: '勝率',
    totalSurvivalTime: '総生存時間',
    longestSurvival: '最長生存時間',
    averageSurvival: '平均生存時間',
    reset: '統計をリセット',
    confirmReset: '本当に統計をリセットしますか？',
    resetSuccess: '統計をリセットしました',
  },

  // エラー
  error: {
    connectionFailed: '接続に失敗しました',
    gameNotFound: 'ゲームが見つかりません',
    gameFull: 'ゲームが満員です',
    invalidSettings: '無効なゲーム設定です',
    unknown: 'エラーが発生しました',
    retry: '再試行',
  },

  // 共通
  common: {
    yes: 'はい',
    no: 'いいえ',
    ok: 'OK',
    cancel: 'キャンセル',
    close: '閉じる',
    loading: '読み込み中...',
    connecting: '接続中...',
    disconnected: '切断されました',
  },

  // デバッグ
  debug: {
    title: 'デバッグ情報',
    position: '位置',
    velocity: '速度',
    fuel: '燃料',
    isOni: '鬼',
    onGround: '地面',
    fps: 'FPS',
    players: 'プレイヤー',
    aiPlayers: 'AIプレイヤー',
  },
};
