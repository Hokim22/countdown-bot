# セットアップガイド

## 1. 前提条件
- AWS CLI設定済み
- Terraform インストール済み
- Node.js インストール済み

## 2. Slack App作成
1. https://api.slack.com/apps にアクセス
2. "Create New App" → "From scratch"
3. App名: "カウントダウンBot"
4. "Incoming Webhooks" を有効化
5. "Add New Webhook to Workspace"
6. 投稿先チャンネルを選択
7. Webhook URLをコピー

## 3. デプロイ実行
```bash
# プロジェクトディレクトリに移動
cd countdown-bot

# デプロイ実行
deploy.bat
```

## 4. データ設定
1. `src/sample-data.json` のWebhook URLを更新
2. 試験情報を編集（日付、キャラクター等）
3. データを登録:
```bash
cd src
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
node setup-data.js
```

## 5. 動作確認
- Lambda関数を手動実行してテスト
- EventBridgeで毎日自動実行される

## 6. カスタマイズ
- `lambda/index.js`: メッセージ生成ロジック
- `terraform/main.tf`: 実行時間変更（cron式）
- キャラクター設定でメッセージの雰囲気を調整

## トラブルシューティング
- Bedrock利用にはモデルアクセス申請が必要
- Slack Webhook URLは正確にコピー
- 日付形式: YYYY-MM-DD