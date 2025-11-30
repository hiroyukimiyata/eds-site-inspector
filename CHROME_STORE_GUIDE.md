# Chrome Web Store 公開ガイド

このガイドでは、EDS Site InspectorをChrome Web Storeに公開する手順を説明します。

## 事前準備チェックリスト

- [x] manifest.jsonのauthorフィールドを設定（"Your Name"を実際の名前に変更してください）
- [x] プライバシーポリシーを作成済み（PRIVACY_POLICY.md）
- [x] ストア説明文を準備済み（STORE_DESCRIPTION.md）
- [x] LICENSEファイルを作成済み
- [ ] スクリーンショットを撮影（1280x800または640x400、1-5枚）
- [ ] プロモーション画像を準備（オプション）

## パッケージの作成

1. 拡張機能をビルド：
```bash
npm run build
```

2. Chrome Web Store用のZIPファイルを作成：
```bash
npm run package
```

これにより、`eds-site-inspector-v1.0.0.zip`がプロジェクトルートに作成されます。

## Chrome Web Store Developer Dashboard での作業

### 1. アカウント登録

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. Googleアカウントでログイン
3. 初回のみ$5の登録料を支払い（一度だけ）

### 2. 新しいアイテムの作成

1. 「新しいアイテム」ボタンをクリック
2. ZIPファイルをアップロード（`eds-site-inspector-v1.0.0.zip`）
3. アップロードが完了するまで待機

### 3. ストア情報の入力

#### 基本情報

- **名前**: `EDS Site Inspector`
- **短い説明**: STORE_DESCRIPTION.mdの「短い説明」セクションを参照（132文字以内）
- **詳細説明**: STORE_DESCRIPTION.mdの「詳細説明」セクションを参照

#### カテゴリ

- **カテゴリ**: `Developer Tools` または `Productivity` を選択
- **言語**: 日本語と英語の両方をサポート可能

#### 画像

- **スクリーンショット**: 1280x800または640x400の画像を1-5枚アップロード
  - 拡張機能の動作を示す画像
  - ポップアップの画面
  - DevToolsパネルの画面
  - オーバーレイが表示されているページの画面

- **プロモーション画像**（オプション）:
  - 小さいプロモーションタイル: 440x280
  - 大きいプロモーションタイル: 920x680

#### プライバシー

- **プライバシーポリシー**: PRIVACY_POLICY.mdの内容をWeb上に公開し、そのURLを入力
  - GitHub Pages、GitHub Gist、または独自のWebサイトを使用可能
  - 例: `https://yourusername.github.io/eds-site-inspector/privacy-policy.html`

#### その他

- **ホームページのURL**: GitHubリポジトリのURL（あれば）
- **サポートURL**: GitHubリポジトリのIssuesページのURL（あれば）

### 4. 公開設定

- **公開範囲**: 
  - **公開**: すべてのユーザーが検索・インストール可能
  - **限定公開**: 指定したユーザーのみがインストール可能

### 5. レビュー用に送信

1. すべての情報を入力したら、「変更を保存」をクリック
2. 「レビュー用に送信」をクリック
3. レビューは通常1-3営業日で完了します

## レビュー後の対応

- 承認されると、拡張機能がChrome Web Storeに公開されます
- 拒否された場合は、フィードバックに基づいて修正し、再提出してください

## 更新手順

バージョンを更新する場合：

1. `package.json`と`src/manifest.json`のバージョンを更新
2. `npm run build`でビルド
3. `npm run package`でZIPファイルを作成
4. Chrome Web Store Developer Dashboardで「新しいバージョンをアップロード」をクリック
5. 変更内容を説明し、レビュー用に送信

## 注意事項

- ZIPファイルには`.map`ファイルを含めない（package.jsで除外済み）
- スクリーンショットは実際の機能を示すものにしてください
- プライバシーポリシーは必ず公開されたURLを提供してください
- レビュー中は変更を加えないでください

## トラブルシューティング

### ZIPファイルが大きすぎる場合

- ソースマップファイル（`.map`）を除外（package.jsで既に対応済み）
- 不要なファイルを削除

### レビューが拒否された場合

- フィードバックを確認し、指摘された問題を修正
- プライバシーポリシーのURLが正しくアクセス可能か確認
- スクリーンショットが実際の機能を示しているか確認

