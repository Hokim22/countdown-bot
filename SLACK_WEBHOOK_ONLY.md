# Slack Webhook 簡単セットアップ

## 1. Slack Appの作成
1. https://api.slack.com/apps にアクセス
2. **"Create New App"** → **"From scratch"**
3. App名: **"カウントダウンBot"**
4. ワークスペースを選択

## 2. Incoming Webhooksの有効化
1. 左メニュー **"Incoming Webhooks"**
2. **"Activate Incoming Webhooks"** をON
3. **"Add New Webhook to Workspace"**
4. チャンネル選択（例: #general）
5. **"Allow"** をクリック

## 3. Webhook URLをコピー
- 表示されたWebhook URLをコピー
- 例: `https://hooks.slack.com/services/T123/B456/xyz`

## 4. データファイルを編集
`src/sample-data.json` の `slackWebhookUrl` を更新:
```json
{
  "slackWebhookUrl": "ここにコピーしたURL"
}
```

## 5. データ登録
```bash
cd src
node setup-data.js
```

この方法ならボットユーザー不要で動作します！