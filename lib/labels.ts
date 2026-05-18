import type { BindingCategory } from "./zmk-bindings";

/**
 * ZMK の behavior 名（`kp`, `mo`, `lt`, ...）に対する日本語表示ラベル。
 * UI で `&mt` のような専門用語を見せないために挟むレイヤ。
 */
export const BEHAVIOR_LABEL_JA: Record<string, string> = {
  kp: "通常キー",
  mo: "レイヤホールド",
  lt: "レイヤタップ",
  mt: "修飾タップ",
  to: "レイヤ移動",
  tog: "レイヤトグル",
  trans: "透過",
  none: "無効",
  mkp: "マウスクリック",
  msc: "スクロール",
  bt: "Bluetooth",
  bootloader: "ブートローダ",
  sys_reset: "リセット",
  reset: "リセット",
  caps_word: "キャプスワード",
  lt_mkp: "レイヤタップ＋クリック",
  to_layer_0: "L0へ戻る",
  inc_dec_kp: "ロータリー(キー)",
  inc_dec_cp: "ロータリー(メディア)",
  lt_to_layer_0: "レイヤタップ→L0",
  scroll_up_down: "スクロール上下",
  scroll: "スクロール",
};

export function behaviorLabel(behavior: string): string {
  return BEHAVIOR_LABEL_JA[behavior] ?? behavior;
}

/**
 * カテゴリの日本語ラベル。キーキャップの "種類" 表示や、Behaviors パネルの
 * セクション見出しに使う。
 */
export const CATEGORY_LABEL_JA: Record<BindingCategory, string> = {
  key: "通常キー",
  modifier: "修飾キー",
  layer: "レイヤ",
  "hold-tap": "ホールドタップ",
  mouse: "マウス",
  bluetooth: "Bluetooth",
  media: "メディア",
  sensor: "センサー",
  macro: "マクロ",
  system: "システム",
  transparent: "透過",
  none: "無効",
  custom: "カスタム",
};

export function categoryLabelJa(cat: BindingCategory): string {
  return CATEGORY_LABEL_JA[cat] ?? String(cat);
}

/**
 * 共通 UI ラベル。ボタン名や見出しの日本語化はここで管理する。
 * 配置先のコンポーネントでハードコードしない。
 */
export const UI = {
  // ボタン
  edit: "編集",
  apply: "反映",
  cancel: "取消",
  reset: "戻す",
  download: "ダウンロード",
  preview: "プレビュー",
  connect: "接続",
  disconnect: "切断",
  push: "GitHubに保存",
  pushPending: "保存中…",
  save: "保存",
  add: "追加",
  remove: "削除",
  close: "閉じる",
  done: "完了",
  yes: "はい",
  no: "いいえ",
  retry: "再試行",
  reload: "再読込",

  // セクション見出し
  layers: "レイヤ",
  behaviors: "ホールドタップ動作",
  combos: "コンボ",
  trackball: "トラックボール",
  encoder: "ロータリーエンコーダ",
  github: "GitHub連携",
  studio: "ライブ編集 (Studio)",
  monitor: "リアルタイムモニタ",
  settings: "設定",
  guide: "使い方ガイド",

  // 詳細パネル
  keyDetail: "キー詳細",
  behavior: "動作",
  params: "パラメータ",
  category: "種類",
  raw: "元の記述",
  display: "表示",
  keyCode: "キーコード",
  tapKey: "タップ時のキー",
  holdLayer: "ホールド時のレイヤ",
  holdModifier: "ホールド時の修飾キー",
  holdArg: "ホールド時の引数",
  targetLayer: "対象レイヤ",
  custom: "カスタム",
  invalid: "無効",
  edited: "編集済",
  none: "なし",

  // BehaviorEditor
  tappingTerm: "切り替え時間 (ms)",
  tappingTermHint:
    "タップとホールドを切り替える長押し時間。短いほど反応早く、長いほど誤発火しにくい。",
  quickTapMs: "再タップ判定 (ms)",
  quickTapMsHint:
    "直前にタップしてからこの時間内に再タップすると常に「タップ」として扱う。0で無効。",
  requirePriorIdleMs: "直前無入力時間 (ms)",
  requirePriorIdleMsHint:
    "他キーを離してからこの時間以上経たないとホールド判定しない。タイピング中の誤発火を抑える。",
  flavor: "判定方式",
  flavorHint:
    "balanced=バランス型, tap-preferred=タップ優先, hold-preferred=ホールド優先",

  // 接続
  connectViaUsb: "USB接続",
  connectViaHid: "HID接続",
  notConnected: "未接続",
  connected: "接続中",
  bytesIn: "受信バイト数",
  bytesOut: "送信バイト数",

  // 状態
  unsavedChanges: "未保存の変更",
  noChanges: "変更なし",
  pleaseConnect: "接続してから操作してください",

  // ガイド
  guideStudioTitle: "通常の編集（ライブ編集）",
  guideStudioBody:
    "右半身をUSB接続 → 接続ボタン → キーをクリックして編集 → 即座に反映",
  guideUf2Title: "大きな変更（UF2 焼き直し）",
  guideUf2Body:
    "コンボ追加・動作定義の変更などは UF2 を再ビルドして両半身に焼く。詳細はターミナルで zmk-flash-pair を実行。",
  guideLayersTitle: "レイヤ構成",
  guideTroubleTitle: "トラブル対処",
  guideTroubleBody:
    "接続が不安定なら settings_reset を両半身に焼いてから keymap を焼き直し。zmk-flash-pair で対話的に手順を進められる。",
} as const;

/**
 * レイヤ番号 → 役割の日本語ラベル（使い方ガイドや LayerTabs で利用）。
 * スプレッドシート版キーマップに対応。
 */
export const LAYER_PURPOSE_JA: Record<number, string> = {
  0: "デフォルト (QWERTY)",
  1: "テンキー",
  2: "矢印",
  3: "記号",
  4: "マウス",
  5: "ファンクション + メディア",
  6: "Bluetooth",
  7: "スクロール",
};

export function layerPurpose(idx: number): string {
  return LAYER_PURPOSE_JA[idx] ?? `レイヤ ${idx}`;
}
