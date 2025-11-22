const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { EventBridgeClient, PutRuleCommand, PutTargetsCommand } = require('@aws-sdk/client-eventbridge');
const { randomUUID } = require('crypto');

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const eventBridgeClient = new EventBridgeClient({ region: 'ap-northeast-1' });

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    const method = event.requestContext?.http?.method || event.httpMethod;

    // OPTIONSリクエスト対応
    if (method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // GETリクエスト（favicon等）を無視
    if (method === 'GET') {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not Found' }) };
    }

    // POST以外は拒否
    if (method !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        console.log('Event:', JSON.stringify(event));
        
        // Lambda Function URLsの場合、bodyが文字列
        const body = event.body ? JSON.parse(event.body) : null;
        
        if (!body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No body provided' })
            };
        }
        
        // バリデーション
        if (!body.examName || !body.targetDate || !body.characters || !body.notificationType || !body.notificationUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }
        
        if (!Array.isArray(body.characters) || body.characters.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'At least one character is required' })
            };
        }
        
        // 通知時間のデフォルトは9:00 (JST)
        const notificationTime = body.notificationTime || '09:00';

        // 日付チェック（今日以降なOK）
        const targetDate = new Date(body.targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Target date must be today or in the future' })
            };
        }

        // DynamoDBに保存
        const examId = randomUUID();
        const item = {
            examId,
            examName: body.examName,
            targetDate: body.targetDate,
            characters: body.characters,
            notificationType: body.notificationType,
            notificationUrl: body.notificationUrl,
            notificationTime,
            createdAt: new Date().toISOString()
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: marshall(item)
        }));

        // EventBridgeルールを作成
        const [hour, minute] = notificationTime.split(':');
        const cronExpression = `cron(${minute} ${hour} * * ? *)`; // JSTの時間をUTCに変換が必要
        
        // JSTかUTCに変換
        let utcHour = parseInt(hour) - 9;
        if (utcHour < 0) utcHour += 24;
        const utcCron = `cron(${minute} ${utcHour} * * ? *)`;
        
        const ruleName = `countdown-${examId}`;
        
        await eventBridgeClient.send(new PutRuleCommand({
            Name: ruleName,
            ScheduleExpression: utcCron,
            State: 'ENABLED',
            Description: `Countdown notification for ${body.examName}`
        }));
        
        await eventBridgeClient.send(new PutTargetsCommand({
            Rule: ruleName,
            Targets: [{
                Id: '1',
                Arn: process.env.LAMBDA_ARN,
                Input: JSON.stringify({ examId })
            }]
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, examId })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
