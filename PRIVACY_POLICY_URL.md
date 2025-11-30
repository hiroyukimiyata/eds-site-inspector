# プライバシーポリシーのURL

Chrome Web Storeで使用するプライバシーポリシーのURL：

## 方法1: GitHub Raw URL（推奨・最も簡単）

`PRIVACY_POLICY.md`をリポジトリにコミット・プッシュした後、以下のURLを使用：

```
https://raw.githubusercontent.com/hiroyukimiyata/eds-site-inspector/main/PRIVACY_POLICY.md
```

または、ブランチ名が異なる場合は：
```
https://raw.githubusercontent.com/hiroyukimiyata/eds-site-inspector/[ブランチ名]/PRIVACY_POLICY.md
```

## 方法2: GitHub Pages（HTML形式で公開）

1. `PRIVACY_POLICY.md`をHTMLに変換して公開
2. GitHub Pagesを有効化
3. 以下のようなURLが使用可能：
   ```
   https://hiroyukimiyata.github.io/eds-site-inspector/privacy-policy.html
   ```

## 推奨手順

1. `PRIVACY_POLICY.md`をリポジトリにコミット・プッシュ：
   ```bash
   git add PRIVACY_POLICY.md
   git commit -m "Add privacy policy for Chrome Web Store"
   git push
   ```

2. 方法1のRaw URLを使用（最も簡単）

3. Chrome Web Store Developer Dashboardで、プライバシーポリシーのURL欄に上記のURLを入力

