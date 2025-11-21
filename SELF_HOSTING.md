# セルフホスティング手順

自分のAWS環境でカウントダウンbotを構築する手順です。

## 前提条件

- AWSアカウント
- AWS CLI設定済み
- Terraform インストール済み（または手動デプロイ）
- Node.js インストール済み

## 手順

### 1. Gemini APIキー取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. APIキーをコピー

### 2. 通知先の設定

#### Slack
1. [Slack API](https://api.slack.com/apps) でアプリ作成
2. Incoming Webhooksを有効化
3. Webhook URLをコピー

#### LINE Notify
1. [LINE Notify](https://notify-bot.line.me/) にアクセス
2. 「トークンを発行する」をクリック
3. トークンをコピー

#### Discord
1. サーバー設定 → 連携サービス → Webhook
2. Webhookを作成
3. Webhook URLをコピー

#### Microsoft Teams
1. チャネル → コネクタ → Incoming Webhook
2. Webhookを作成
3. Webhook URLをコピー

### 3. リポジトリクローン

```bash
git clone https://github.com/YOUR_USERNAME/countdown-bot.git
cd countdown-bot
```

### 4. Terraform設定

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集：
```hcl
gemini_api_key = "YOUR_GEMINI_API_KEY"
```

### 5. インフラ構築

```bash
terraform init
terraform plan
terraform apply
```

### 6. Lambda関数デプロイ

#### 通知Bot
```bash
cd ../lambda
npm install
build.bat  # Windows
# または ./build.sh  # Linux/Mac

aws lambda update-function-code --function-name countdown-bot --zip-file fileb://countdown-bot.zip
```

#### 登録API（オプション - Webフォーム使用時）
```bash
build-register.bat  # Windows

aws lambda update-function-code --function-name countdown-bot-register --zip-file fileb://register-bot.zip
```

### 7. 環境変数設定

```bash
aws lambda update-function-configuration --function-name countdown-bot \
  --environment "Variables={DYNAMODB_TABLE=exam-countdown,GEMINI_API_KEY=YOUR_API_KEY,GEMINI_MODEL=gemini-2.5-flash}"
```

### 8. 試験データ登録

#### 方法1: Webフォーム（推奨）
1. `web/index.html` をブラウザで開く
2. API Gateway URLを設定（Terraform出力から取得）
3. フォームから登録

#### 方法2: スクリプト
```bash
cd ../src
npm install
```

`sample-data.json` を編集：
```json
[
  {
    "examId": "exam001",
    "examName": "AWS認定試験",
    "targetDate": "2025-12-01",
    "character": "毒舌系フリーター",
    "notificationType": "slack",
    "notificationUrl": "YOUR_WEBHOOK_URL"
  }
]
```

```bash
node setup-data.js
```

### 9. テスト実行

```bash
aws lambda invoke --function-name countdown-bot response.json
cat response.json
```

通知先を確認してメッセージが届いていればOK！

## トラブルシューティング

### Lambda実行エラー
```bash
aws logs tail /aws/lambda/countdown-bot --follow
```

### DynamoDBデータ確認
```bash
aws dynamodb scan --table-name exam-countdown
```

### Lambda Function URL確認
```bash
aws lambda get-function-url-config --function-name countdown-bot-register
```

## コスト

**完全無料（AWS無料枠内）**
- Lambda: 100万リクエスト/月
- DynamoDB: 25GB + 2.5億リクエスト/月
- API Gateway: 100万リクエスト/月（12ヶ月間）
- Gemini API: 1,500リクエスト/日

毎日1回の通知なら完全無料で運用可能です。

## 削除方法

```bash
cd terraform
terraform destroy
```

## サポート

問題が発生した場合は [GitHub Issues](https://github.com/YOUR_USERNAME/countdown-bot/issues) で報告してください。
