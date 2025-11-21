@echo off
echo Building Lambda function...

call npm install

if exist countdown-bot.zip del countdown-bot.zip
powershell Compress-Archive -Path index.js,package.json,node_modules -DestinationPath countdown-bot.zip

echo Build complete: countdown-bot.zip
