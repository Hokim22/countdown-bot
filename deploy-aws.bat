@echo off
echo AWS CLIでリソースを作成しています...

REM DynamoDBテーブル作成
echo DynamoDBテーブルを作成中...
aws dynamodb create-table ^
    --table-name exam-countdown ^
    --attribute-definitions AttributeName=examId,AttributeType=S ^
    --key-schema AttributeName=examId,KeyType=HASH ^
    --billing-mode PAY_PER_REQUEST ^
    --region ap-northeast-1

REM IAMロール作成
echo IAMロールを作成中...
aws iam create-role ^
    --role-name countdown-bot-lambda-role ^
    --assume-role-policy-document file://trust-policy.json

REM IAMポリシーをアタッチ
aws iam attach-role-policy ^
    --role-name countdown-bot-lambda-role ^
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy ^
    --role-name countdown-bot-lambda-role ^
    --policy-name DynamoDBAccess ^
    --policy-document file://dynamodb-policy.json

aws iam put-role-policy ^
    --role-name countdown-bot-lambda-role ^
    --policy-name BedrockAccess ^
    --policy-document file://bedrock-policy.json

echo 10秒待機してからLambda関数を作成します...
timeout /t 10

REM Lambda関数作成
echo Lambda関数を作成中...
aws lambda create-function ^
    --function-name countdown-bot ^
    --runtime nodejs18.x ^
    --role arn:aws:iam::339712870335:role/countdown-bot-lambda-role ^
    --handler index.handler ^
    --zip-file fileb://../lambda/countdown-bot.zip ^
    --timeout 30 ^
    --environment Variables="{DYNAMODB_TABLE=exam-countdown}" ^
    --region ap-northeast-1

REM EventBridgeルール作成
echo EventBridgeルールを作成中...
aws events put-rule ^
    --name daily-countdown ^
    --schedule-expression "cron(0 0 * * ? *)" ^
    --region ap-northeast-1

REM Lambda実行権限追加
aws lambda add-permission ^
    --function-name countdown-bot ^
    --statement-id AllowEventBridge ^
    --action lambda:InvokeFunction ^
    --principal events.amazonaws.com ^
    --source-arn arn:aws:events:ap-northeast-1:339712870335:rule/daily-countdown ^
    --region ap-northeast-1

REM EventBridgeターゲット追加
aws events put-targets ^
    --rule daily-countdown ^
    --targets "Id"="1","Arn"="arn:aws:lambda:ap-northeast-1:339712870335:function:countdown-bot" ^
    --region ap-northeast-1

echo ✅ デプロイ完了！