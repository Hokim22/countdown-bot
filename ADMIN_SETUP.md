# 管理者ページセットアップ

## 概要
管理者ページでは、登録されている全てのカウントダウンデータと通知URLを確認できます。

## セットアップ手順

### 1. 管理者キーの設定

`terraform/terraform.tfvars` に管理者キーを追加：

```hcl
gemini_api_key = "YOUR_GEMINI_API_KEY"
admin_key      = "YOUR_STRONG_PASSWORD"  # 追加
```

### 2. Terraformでデプロイ

```bash
cd terraform
terraform apply
```

デプロイ後、`manage_function_url` が出力されます。

### 3. admin.htmlの設定

`docs/admin.html` の `MANAGE_URL` を更新：

```javascript
const MANAGE_URL = 'https://xxxxx.lambda-url.ap-northeast-1.on.aws/'; // Terraformの出力値
```

### 4. アクセス

`docs/admin.html` をブラウザで開き、管理者キーを入力してログイン。

## セキュリティ注意事項

- 管理者キーは絶対に公開しないでください
- `admin.html` は公開サーバーにアップロードしないでください
- ローカルでのみ使用することを推奨します
- 必要に応じてIPアドレス制限を追加してください

## 表示される情報

- 目標名
- 目標日
- 通知時間
- キャラクター
- 通知タイプ
- **通知URL（Webhook URL）**
- 登録日
- ID
