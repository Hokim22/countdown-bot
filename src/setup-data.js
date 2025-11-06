const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const fs = require('fs');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });

async function setupData() {
    try {
        const data = JSON.parse(fs.readFileSync('./sample-data.json', 'utf8'));
        
        for (const exam of data) {
            const command = new PutItemCommand({
                TableName: 'exam-countdown',
                Item: marshall(exam)
            });
            
            await client.send(command);
            console.log(`✅ 登録完了: ${exam.examName}`);
        }
        
        console.log('🎉 全データの登録が完了しました！');
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}

setupData();