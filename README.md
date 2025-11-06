# 試験カウントダウンBot

資格試験までの日数をカウントダウンし、生成AIでキャラクター応援メッセージを送信するSlackbotです。

## アーキテクチャ
- **Lambda**: カウントダウン計算・メッセージ生成
- **DynamoDB**: 試験データ保存
- **EventBridge**: 定期実行
- **Bedrock**: 生成AI応援メッセージ
- **Slack**: 通知先

## セットアップ手順
1. Slack App作成・Webhook URL取得
2. AWS環境構築（Terraform）
3. Lambda関数デプロイ
4. 試験データ登録

## ディレクトリ構造
```
countdown-bot/
├── src/           # 設定・データファイル
├── lambda/        # Lambda関数
├── terraform/     # インフラ定義
└── README.md
```