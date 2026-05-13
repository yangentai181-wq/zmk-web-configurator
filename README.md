# ZMK Web Configurator

Phase 1 read-only visualizer for ZMK split keyboard firmware
(`hyhy-masa/minimal-keys-trackball-test` 系の構成を想定)。

## 機能（Phase 1）

- `.keymap` の物理レイアウト＋全レイヤー描画 (SVG)
- レイヤータブ切替 / キークリックで詳細表示
- `sensor-bindings` をレイヤー別に表示
- `.conf` から PMW3610 トラックボール設定を表示
- `.conf` から EC11 ロータリーエンコーダー設定を表示
- `.overlay` から `scroll-layers` / `automouse-layer` を抽出

編集機能 (Phase 2)、Combo Editor (Phase 3)、
GitHub Actions ビルド (Phase 4)、ZMK Studio RPC (Phase 5) は未実装。

## セットアップ

```bash
npm install
npm run dev
# http://localhost:3000
```

## ディレクトリ構成

```
app/                Next.js App Router
  page.tsx          fixture を読み込んで <ConfiguratorView> を描画
components/
  ConfiguratorView  全体のレイアウト・状態管理
  KeyboardView      盤面 (SVG)
  LayerTabs         レイヤー切替
  KeyDetail         右ペイン（選択キー詳細）
  TrackballPanel    PMW3610 設定表示
  EncoderPanel      EC11 + sensor-bindings 表示
  StatusBar         上部の Combos/Layers/TB/Encoder バッジ
lib/
  types.ts          KeyboardConfig 型定義
  keymap-parser.ts  .keymap → KeymapDoc
  conf-parser.ts    .conf → ConfEntry[]
  overlay-parser.ts .overlay → ノードプロパティ抽出
  zmk-bindings.ts   bindings の表示名・カテゴリ分類
  load-config.ts    fixtures を読み込んで KeyboardConfig 構築
fixtures/           minimal-keys-release 実ファームウェアのコピー
```

## fixture を差し替えるには

`fixtures/` 配下の `.keymap` / `.json` / `boards/shields/<name>/*` を任意のファームウェアで置き換える。
`lib/load-config.ts` のファイル名定数を編集すれば別キーボードにも対応可能。

## ロードマップ（Notion 構想からの抜粋）

- Phase 1 ✅ Visualizer
- Phase 2: Keymap Editor (`.keymap` 書き出し)
- Phase 3: Combo Editor
- Phase 4: GitHub Actions ビルド連携
- Phase 5: ZMK Studio / RPC 連携
