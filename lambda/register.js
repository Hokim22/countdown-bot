const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { randomUUID } = require('crypto');

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONSリクエスト対応
    if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
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
        if (!body.examName || !body.targetDate || !body.character || !body.notificationType || !body.notificationUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }
        
        // 通知時間のデフォルトは9:00 (JST)
        const notificationTime = body.notificationTime || '09:00';

        // 日付チェック
        const targetDate = new Date(body.targetDate);
        if (targetDate < new Date()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Target date must be in the future' })
            };
        }

        // DynamoDBに保存
        const examId = randomUUID();
        const item = {
            examId,
            examName: body.examName,
            targetDate: body.targetDate,
            character: body.character,
            notificationType: body.notificationType,
            notificationUrl: body.notificationUrl,
            notificationTime,
            createdAt: new Date().toISOString()
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: marshall(item)
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
