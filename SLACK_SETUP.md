# Slack App セットアップガイド

## 1. Slack Appの作成
1. https://api.slack.com/apps にアクセス
2. **"Create New App"** をクリック
3. **"From scratch"** を選択
4. App名: **"カウントダウンBot"**
5. ワークスペースを選択して **"Create App"**

## 2. Incoming Webhooksの設定
1. 左メニューから **"Incoming Webhooks"** を選択
2. **"Activate Incoming Webhooks"** をONにする
3. **"Add New Webhook to Workspace"** をクリック
4. 投稿先チャンネルを選択（例: #general, #study など）
5. **"Allow"** をクリック

## 3. Webhook URLをコピー
- 作成されたWebhook URLをコピー
- 形式: `https://hooks.slack.com/services/T.../B.../...`

## 4. サンプルデータを編集
`src/sample-data.json` を開いて以下を編集:
- `slackWebhookUrl`: コピーしたWebhook URLに変更
- `targetDate`: 実際の試験日に変更
- `examName`: 受験予定の試験名に変更
- `character`: お好みのキャラクター設定

## 5. データを登録
```bash
cd src
node setup-data.js
```

## 6. テスト実行
Lambda関数を手動実行してSlackに投稿されるかテスト:
```bash
aws lambda invoke --function-name countdown-bot --region ap-northeast-1 response.json
```

## 注意事項
- Webhook URLは秘密情報として扱ってください
- 毎日朝7:30に自動実行されます
- Bedrockの利用には事前にモデルアクセス申請が必要です