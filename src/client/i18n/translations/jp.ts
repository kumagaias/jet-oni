/**
 * Japanese translations for JetOni game
 */

import { Translations } from '../i18n';

export const jp: Translations = {
  // メニュー翻訳
  menu: {
    title: 'ジェットオニ',
    subtitle: '3D鬼ごっこゲーム',
    createGame: 'ゲーム作成',
    joinGame: 'ゲーム参加',
    statistics: '統計',
    settings: '設定',
    back: '戻る',
    language: '言語',
    english: 'English',
    japanese: '日本語',
  },

  // ゲーム設定
  settings: {
    title: 'ゲーム設定',
    players: 'プレイヤー数',
    duration: '時間',
    rounds: 'ラウンド数',
    minutes: '{count}分',
    round: '{count}ラウンド',
    roundPlural: '{count}ラウンド',
    startGame: 'ゲーム開始',
    confirm: '決定',
    cancel: 'キャンセル',
  },

  // ゲームリスト
  gameList: {
    title: '参加可能なゲーム',
    noGames: 'ゲームがありません',
    join: '参加',
    full: '満員',
    players: '{current}/{max}人',
    duration: '{minutes}分',
    rounds: '{count}ラウンド',
  },

  // ロビー
  lobby: {
    title: 'ロビー',
    waiting: 'プレイヤーを待っています...',
    players: 'プレイヤー: {current}/{max}',
    pressSpace: 'SPACEキーで開始',
    ready: '準備完了',
    notReady: '準備中',
  },

  // ゲームHUD
  hud: {
    timer: '残り時間: {time}',
    oni: '鬼',
    runners: '逃げる側',
    fuel: '燃料',
    status: {
      oni: '鬼',
      runner: '逃げる側',
    },
    playerCount: '鬼: {oni} | 逃げる側: {runners}',
  },

  // ゲームメッセージ
  game: {
    becameOni: '鬼になった！',
    tagged: '{player}をタッチした！',
    spotted: '見つかった！',
    escaped: '逃げ切った！',
    gameStart: 'ゲーム開始！',
    gameEnd: 'ゲーム終了！',
    roundEnd: 'ラウンド{round}終了',
    nextRound: '次のラウンドまで{seconds}秒',
  },

  // コントロール
  controls: {
    movement: '移動',
    wasd: 'WASD - 移動',
    mouse: 'マウス - 視点',
    space: 'SPACE - ジャンプ/ジェットパック',
    shift: 'SHIFT - ダッシュ',
    e: 'E - ビーコン',
    esc: 'ESC - メニュー',
    f3: 'F3 - デバッグ',
    
    // モバイルコントロール
    dash: 'ダッシュ',
    jetpack: 'ジェットパック',
    beacon: 'ビーコン',
    jump: 'ジャンプ',
  },

  // 能力
  abilities: {
    jetpack: {
      name: 'ジェットパック',
      description: '上昇飛行（鬼専用）',
      fuelCost: '燃料: {cost}/秒',
    },
    dash: {
      name: 'ダッシュ',
      description: '高速移動（逃げる側専用）',
      fuelCost: '燃料: {cost}/秒',
    },
    beacon: {
      name: 'ビーコン',
      description: '全員の位置を表示（鬼専用）',
      cooldown: 'リチャージ: {time}秒',
      active: '有効: {time}秒',
      ready: '使用可能！',
    },
    jump: {
      name: 'ジャンプ',
      description: 'ジャンプ（逃げる側専用）',
    },
  },

  // 結果画面
  results: {
    title: '結果',
    winner: '勝者',
    survived: '生存',
    tagged: 'タッチされた',
    survivalTime: '生存時間: {time}秒',
    longestSurvival: '最長生存: {player} ({time}秒)',
    escaped: '逃げ切り！',
    caught: 'タッチされた',
    backToMenu: 'メニューに戻る',
    nextRound: '次のラウンド',
    finalResults: '最終結果',
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
    reset: '統計をリセット',
    confirmReset: '本当に統計をリセットしますか？',
    noStats: 'まだ統計がありません。ゲームをプレイしましょう！',
  },

  // エラー
  errors: {
    connectionFailed: '接続に失敗しました',
    gameNotFound: 'ゲームが見つかりません',
    gameFull: 'ゲームが満員です',
    invalidSettings: '無効な設定です',
    unknown: 'エラーが発生しました',
  },

  // 共通
  common: {
    yes: 'はい',
    no: 'いいえ',
    ok: 'OK',
    cancel: 'キャンセル',
    close: '閉じる',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
  },
};
