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

## 使い方

### 🌐 Webフォームで登録（推奨）

1. [Webフォーム](https://YOUR_DOMAIN/web/index.html) にアクセス
2. 試験情報を入力
3. キャラクターを選択
4. 通知先を設定
5. 登録ボタンをクリック

→ 毎日自動で応援メッセージが届きます！

### 🛠️ セルフホスティング

自分のAWS環境で構築したい場合は [SELF_HOSTING.md](SELF_HOSTING.md) を参照してください。

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
- Lambda Function URLs: 完全無料
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