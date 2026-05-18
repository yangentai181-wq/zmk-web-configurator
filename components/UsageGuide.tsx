"use client";

import { useState } from "react";
import { ui } from "@/lib/ui";
import { LAYER_PURPOSE_JA } from "@/lib/labels";

/**
 * 使い方ガイド。折りたたみ式で、変更フロー・レイヤ仕様・トラブル対処を
 * 1 箇所にまとめる。ユーザーが「手順を忘れた」時の参照先。
 */
export function UsageGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className={ui.card}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <h2 className="text-sm font-bold">📖 使い方ガイド</h2>
        <span className="text-xs text-ink-secondary">
          {open ? "閉じる ▲" : "開く ▼"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-5 text-xs leading-relaxed text-ink-primary">
          <Section
            emoji="🔄"
            title="通常の編集 — ライブ編集 (推奨)"
            body={
              <>
                <p>
                  右半身を USB ケーブルで PC に接続して、 「ライブ編集
                  (Studio)」セクションの <b>接続</b> ボタンを押します。
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>右半身のみ USB 接続 (左は無線でも有線でも可)</li>
                  <li>ブラウザの WebSerial ダイアログで XIAO を選択</li>
                  <li>
                    盤面のキーをクリック → <b>編集</b> → 変更
                  </li>
                  <li>反映ボタンで即時書き込み (リブート不要)</li>
                </ol>
                <p className="mt-2 text-ink-secondary">
                  ※ ホールドタップ動作の <b>定義そのもの</b> を変える時は次の
                  UF2 焼き直しが必要。
                </p>
              </>
            }
          />

          <Section
            emoji="⏳"
            title="大きな変更 — UF2 焼き直し"
            body={
              <>
                <p>
                  コンボの追加、新しいホールドタップ動作の定義、トラックボール設定の変更
                  は UF2 を再ビルドして両半身に焼く必要があります。
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>
                    Web Configurator の <b>GitHubに保存</b> ボタンで .keymap を
                    push
                  </li>
                  <li>GitHub Actions が自動でビルド (約 2 分)</li>
                  <li>
                    完了したら CI Watch から UF2 ダウンロード、または
                    ターミナルで:
                    <pre className="mt-1 overflow-x-auto rounded bg-canvas px-2 py-1 text-[11px]">
                      zmk-flash-pair
                    </pre>
                  </li>
                  <li>
                    案内に従って、両半身を順にリセットボタン2連打 → 自動で UF2
                    がコピーされる
                  </li>
                </ol>
              </>
            }
          />

          <Section
            emoji="📚"
            title="レイヤ構成"
            body={
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-ink-secondary">
                    <th className="pr-3 font-medium">レイヤ</th>
                    <th className="font-medium">役割</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(LAYER_PURPOSE_JA).map(([idx, purpose]) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="py-1 pr-3 font-mono">L{idx}</td>
                      <td className="py-1">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />

          <Section
            emoji="🔧"
            title="トラブル対処"
            body={
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <b>左半身が繋がらない</b> → 両半身に{" "}
                  <code>settings_reset</code> を焼き直してペアリングし直す (
                  <code>zmk-flash-pair</code> 内で y を選択)
                </li>
                <li>
                  <b>キーが反応しない</b> →
                  一度ケーブルを抜き、リセットボタン1回押しで再起動
                </li>
                <li>
                  <b>ライブ編集で接続できない</b> →
                  ブラウザのアドレスバー左のアイコンから USB
                  権限を確認、または右半身のリセット1回
                </li>
                <li>
                  <b>変更しても反映されない</b> →
                  ブラウザのコンソールでエラーがないか確認、ページを再読込
                </li>
              </ul>
            }
          />

          <Section
            emoji="💡"
            title="ホールドタップ動作のチューニング"
            body={
              <p>
                BACKSPACE が連打できない / Shift が誤発火する、などの違和感は
                「ホールドタップ動作」セクションで切替時間 (tapping-term) や
                判定方式 (flavor) を調整して解決できます。プリセットから始めて
                微調整するのがおすすめ。
              </p>
            }
          />
        </div>
      )}
    </section>
  );
}

function Section({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-ink-primary">
        {emoji} {title}
      </h3>
      <div className="mt-1">{body}</div>
    </div>
  );
}
