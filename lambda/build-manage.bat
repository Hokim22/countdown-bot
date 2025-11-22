@echo off
echo Building manage Lambda function...

mkdir manage-temp 2>nul
copy manage.js manage-temp\index.js
copy manage-package.json manage-temp\package.json

cd manage-temp
call npm install

if exist ..\manage-bot.zip del ..\manage-bot.zip
powershell Compress-Archive -Path index.js,package.json,node_modules -DestinationPath ..\manage-bot.zip

cd ..
rmdir /s /q manage-temp

echo Build complete: manage-bot.zip
