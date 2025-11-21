# 試験カウントダウンBot

資格試験までの日数をカウントダウンし、生成AIでキャラクター応援メッセージを送信するSlackbotです。

## 特徴
- 🎭 8種類のキャラクターがランダムで応援
- 🤖 Google Gemini 2.5 Flash で生成AIメッセージ
- 💰 **完全無料**（AWS無料枠 + Gemini無料枠）
- 📱 **マルチ通知対応**（Slack / LINE / Discord / Teams）

## アーキテクチャ
- **Lambda**: カウントダウン計算・メッセージ生成
- **DynamoDB**: 試験データ保存
- **EventBridge**: 定期実行
- **Gemini API**: 生成AI応援メッセージ（無料）
- **Slack**: 通知先

## セットアップ手順

### 1. Gemini APIキー取得
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. 無料枠: 15 RPM、1,500 RPD

### 2. 通知先の設定

#### Slack
1. Slack Appを作成
2. Incoming Webhookを有効化
3. Webhook URLをコピー

#### LINE Notify
1. [LINE Notify](https://notify-bot.line.me/) にアクセス
2. トークンを発行
3. トークンをコピー

#### Discord
1. サーバー設定 → 連携サービス → Webhook
2. Webhookを作成
3. Webhook URLをコピー

#### Microsoft Teams
1. チャネル → コネクタ → Incoming Webhook
2. Webhookを作成
3. Webhook URLをコピー

### 3. AWS環境構築
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvarsにGemini APIキーを設定
terraform init
terraform apply
```

### 4. Lambda関数デプロイ
```bash
cd lambda
npm install
build.bat  # Windows
# または ./build.sh  # Linux/Mac

# AWS CLIでデプロイ
aws lambda update-function-code --function-name countdown-bot --zip-file fileb://countdown-bot.zip
```

### 5. 環境変数設定
```bash
aws lambda update-function-configuration --function-name countdown-bot \
  --environment "Variables={DYNAMODB_TABLE=exam-countdown,GEMINI_API_KEY=YOUR_API_KEY,GEMINI_MODEL=gemini-2.5-flash}"
```

### 6. 試験データ登録
```bash
cd src
npm install
node setup-data.js
```

## ディレクトリ構造
```
countdown-bot/
├── src/           # 設定・データファイル
├── lambda/        # Lambda関数（Node.js）
├── terraform/     # インフラ定義（Terraform）
└── README.md
```

## 月額コスト
**完全無料（$0/月）**
- Lambda: 無料枠内（30回/月）
- DynamoDB: 無料枠内
- EventBridge: 無料枠内
- Gemini API: 無料枠内（1,500リクエスト/日）

## キャラクター一覧
1. 天真爛漫な友人
2. 毒舌系フリーター
3. 近所の優しい甘いお姉さん
4. 推しのアイドル
5. 未来の自分
6. 競い合うライバル
7. 守護霊
8. 温かい家族