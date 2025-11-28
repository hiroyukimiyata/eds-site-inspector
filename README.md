# EDS Site Inspector

Chrome 拡張機能として動作する Edge Delivery Services (EDS) サイト向けインスペクターです。公開済みサイトでセクション／ブロックのマークアップを可視化し、Code Bus / Media Bus の実装例を素早く確認できます。

## 主な機能
- **ワンクリック分析**: 拡張機能アイコンを押すと、現在のタブにオーバーレイと UI を注入してページをスキャン。
- **オーバーレイ**: Section と Block を色分け表示。クリックで該当ブロックの HTML スニペットへジャンプ。Control タブで表示の ON/OFF が可能。
- **Blocks タブ**: 検出したブロック一覧を表示。ホバーで該当オーバーレイを強調。
- **Source タブ**: クリックしたブロックの outerHTML を即時確認。
- **Code Bus / Media Bus**: `window.hlx` などの構成情報から Code/Media Base Path を推測し、`admin.hlx.page` の inspect API でファイルツリーや media_ ファイル一覧を取得して表示。
- **ローカル開発**: esbuild ベースのシンプルなビルド。`dist/` をアンパックド拡張として読み込むだけで確認できます。

## セットアップ
```bash
npm install
```

## ビルドとロード
1. ビルドを実行します。
   ```bash
   npm run build
   ```
2. Chrome の拡張機能ページ (`chrome://extensions/`) を開き、右上の「デベロッパーモード」を ON。
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` ディレクトリを選択します。

ウォッチビルドを使う場合は次を利用してください。
```bash
npm run watch
```

## 使い方
1. EDS で構築されたサイトを開きます。
2. 拡張機能アイコンをクリックすると、オーバーレイとコントロール UI が表示されます。
3. オーバーレイをクリックまたは Blocks タブの行を選択すると、Source タブに該当ブロックの HTML が表示されます。
4. Code Bus / Media Bus タブでビルド済みコードや media_ ファイルを一覧できます（`window.hlx.codeBasePath` などが取得できる場合）。

## 実装メモ
- セクションは `<main>` 直下の子要素を基準に検出しています。
- ブロックは `data-block-name`、`block` クラス、または Default Content の代表的なタグ（`h1`、`picture`、`table` など）を対象としています。
- Code/Media Bus のパスが判明した場合は `https://admin.hlx.page/inspect/{owner}/{repo}/{ref}/` からファイル一覧を取得し、Code タブはツリー表示、Media タブは `media_` ファイルをサムネイル付きで表示します。
