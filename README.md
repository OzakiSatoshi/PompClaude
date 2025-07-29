# PompClaude PoC

公共水道ポンプの異常検出システムのPoC（概念実証）

## 概要

PompClaudeは点群データを用いてポンプの変形を検出し、視覚的に表示するWebアプリケーションです。

### 主要機能

- 📊 **変形検出**: 撮影日の異なる同じポンプの点群データ2つの比較
- 🎨 **視覚化**: 変形量の多い箇所を赤色で強調表示
- 📈 **3Dビューア**: インタラクティブな点群データ表示
- 📤 **ファイルアップロード**: LAS/LAZファイルのWeb UIからのアップロード
- ⏱️ **高速処理**: 10秒以内の比較結果表示

## 技術要件

- **プラットフォーム**: Docker
- **処理時間**: 点群データ読み込みから比較結果表示まで10秒以内
- **セキュリティ**: ポンプデータの流出防止、ダウンロード禁止
- **アクセス制御**: 特定URLでのWeb公開、アクセス権限管理

## クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm start
```

アプリケーションは http://localhost:3000 でアクセス可能

### 3. Docker での実行

```bash
# イメージのビルド
docker build -t pompcloud-poc .

# コンテナの実行
docker run -p 3000:3000 pompcloud-poc
```

### 4. Docker Compose での実行

```bash
docker-compose up
```

## API エンドポイント

- `GET /` - メインページ
- `GET /health` - ヘルスチェック
- `POST /upload` - LAS/LAZファイルのアップロード
- `GET /api/status` - システム状態の取得

## 開発状況

### ✅ 完了済み
- 基本Webサーバー
- ファイルアップロード機能
- Docker環境構築
- CI/CD パイプライン

### 🚧 開発中
- 点群データ処理エンジン
- 3Dビューア実装
- 変形検出アルゴリズム

### 📋 予定
- カラーバー表示
- パフォーマンス最適化
- セキュリティ強化

## プロジェクト構造

```
PompClaude/
├── server.js           # メインサーバー
├── package.json        # Node.js依存関係
├── Dockerfile         # Docker設定
├── .dockerignore      # Docker無視ファイル
├── data/              # データディレクトリ
│   └── uploads/       # アップロードファイル保存
├── .github/           # GitHub Actions
│   └── workflows/     # CI/CDワークフロー
└── CLAUDE.md          # Claude Code設定
```

## 技術スタック

- **Backend**: Node.js + Express
- **File Upload**: Multer
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Point Cloud**: 今後実装予定

## 開発ガイドライン

詳細な開発要件と指針については [CLAUDE.md](./CLAUDE.md) を参照してください。

## ライセンス

MIT License