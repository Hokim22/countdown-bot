@echo off
echo Building register Lambda function...

mkdir register-temp 2>nul
copy register.js register-temp\index.js
copy register-package.json register-temp\package.json

cd register-temp
call npm install

if exist ..\register-bot.zip del ..\register-bot.zip
powershell Compress-Archive -Path index.js,package.json,node_modules -DestinationPath ..\register-bot.zip

cd ..
rmdir /s /q register-temp

echo Build complete: register-bot.zip
