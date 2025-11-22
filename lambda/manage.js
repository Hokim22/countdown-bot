const { DynamoDBClient, GetItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { EventBridgeClient, RemoveTargetsCommand, DeleteRuleCommand } = require('@aws-sdk/client-eventbridge');

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const eventBridgeClient = new EventBridgeClient({ region: 'ap-northeast-1' });

exports.handler = async (event) => {
    const method = event.requestContext?.http?.method || event.httpMethod;

    try {
        const examId = event.queryStringParameters?.id;
        const adminKey = event.queryStringParameters?.adminKey;
        
        // 管理者用：全データ取得
        if (method === 'GET' && adminKey && !examId) {
            if (adminKey !== process.env.ADMIN_KEY) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Forbidden' })
                };
            }
            
            const result = await dynamoClient.send(new ScanCommand({
                TableName: process.env.DYNAMODB_TABLE
            }));
            
            const items = result.Items.map(item => unmarshall(item));
            
            return {
                statusCode: 200,
                body: JSON.stringify({ items })
            };
        }
        
        if (!examId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing id parameter' })
            };
        }

        if (method === 'GET') {
            // 取得
            const result = await dynamoClient.send(new GetItemCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: marshall({ examId })
            }));

            if (!result.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Not found' })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify(unmarshall(result.Item))
            };
        } else if (method === 'DELETE') {
            // 削除時も管理者キーをチェック
            if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Forbidden' })
                };
            }
            
            // EventBridgeルールを削除
            const ruleName = `countdown-${examId}`;
            try {
                await eventBridgeClient.send(new RemoveTargetsCommand({
                    Rule: ruleName,
                    Ids: ['1']
                }));
                await eventBridgeClient.send(new DeleteRuleCommand({
                    Name: ruleName
                }));
            } catch (error) {
                console.log('EventBridge rule not found or already deleted:', error.message);
            }
            
            // DynamoDBから削除
            await dynamoClient.send(new DeleteItemCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: marshall({ examId })
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true })
            };
        }

        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
