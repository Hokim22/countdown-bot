@echo off
echo カウントダウンBotをデプロイしています...

REM Lambda関数をビルド
cd lambda
call build.bat
cd ..

REM Terraformでインフラをデプロイ
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
cd ..

echo 🎉 デプロイ完了！

echo.
echo 📋 次のステップ:
echo 1. Slack Appを作成してWebhook URLを取得
echo 2. src/sample-data.json のWebhook URLを更新
echo 3. node src/setup-data.js でデータを登録