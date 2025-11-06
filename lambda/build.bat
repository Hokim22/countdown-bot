@echo off
echo Lambda関数をビルドしています...

REM 依存関係をインストール
call npm install

REM ZIPファイルを作成
if exist countdown-bot.zip del countdown-bot.zip
powershell Compress-Archive -Path index.js,package.json,node_modules -DestinationPath countdown-bot.zip

echo ✅ ビルド完了: countdown-bot.zip