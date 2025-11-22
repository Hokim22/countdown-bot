const { DynamoDBClient, ScanCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const axios = require('axios');

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

exports.handler = async (event) => {
    try {
        // EventBridgeからexamIdが渡される場合
        if (event.examId) {
            const result = await dynamoClient.send(new GetItemCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: marshall({ examId: event.examId })
            }));
            
            if (result.Item) {
                const exam = unmarshall(result.Item);
                await processExam(exam);
            }
        } else {
            // 後方互換性: 全件処理（手動実行時）
            const scanCommand = new ScanCommand({
                TableName: process.env.DYNAMODB_TABLE
            });
            
            const result = await dynamoClient.send(scanCommand);
            const exams = result.Items.map(item => unmarshall(item));
            
            for (const exam of exams) {
                await processExam(exam);
            }
        }
        
        return { statusCode: 200, body: 'Success' };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Error' };
    }
};

async function processExam(exam) {
    const today = new Date();
    const targetDate = new Date(exam.targetDate);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let message;
    if (diffDays > 0) {
        message = await generateMessage(exam, diffDays);
    } else if (diffDays === 0) {
        message = `🎯 **${exam.examName}** 本日が目標日です！頑張って！`;
    } else {
        message = `✅ **${exam.examName}** お疲れ様でした！`;
    }
    
    // マルチ通知対応
    await sendNotification(exam, message);
}

async function generateMessage(exam, daysLeft) {
    const characters = [
        '明るい友人',
        '厳しいコーチ',
        '優しい先輩',
        '未来の自分'
    ];
    
    // ユーザー指定のキャラクターからランダム選択
    let selectedCharacter;
    let customPrompt = '';
    
    if (exam.characters && Array.isArray(exam.characters) && exam.characters.length > 0) {
        const randomChar = exam.characters[Math.floor(Math.random() * exam.characters.length)];
        selectedCharacter = randomChar.name;
        customPrompt = randomChar.prompt || '';
    } else if (exam.character) {
        // 後方互換性
        selectedCharacter = exam.character;
    } else {
        selectedCharacter = characters[Math.floor(Math.random() * characters.length)];
    }
    
    const characterPrompts = {
        '明るい友人': `明るくポジティブな友人として、「${exam.examName}」まであと${daysLeft}日。「〜だね！」口調で絵文字多め。具体的アドバイスと今日の行動提案を180文字で。`,
        '厳しいコーチ': `厳しいコーチとして、「${exam.examName}」まであと${daysLeft}日。「まだまだだな」口調で厳しくも愛ある。実践的アドバイスと今日のタスクを180文字で。`,
        '優しい先輩': `優しい先輩として、「${exam.examName}」まであと${daysLeft}日。「〜ですね」口調で母性的に。無理のないアドバイスと体調気遣いを180文字で。`,
        '未来の自分': `未来の自分として、「${exam.examName}」まであと${daysLeft}日。「おつかれ」「君」口調で落ち着いて。経験に基づく深いアドバイスを180文字で。`
    };
    
    let prompt;
    if (customPrompt) {
        prompt = `${selectedCharacter}として、${customPrompt}「${exam.examName}」まであと${daysLeft}日。具体的アドバイスを180文字で。`;
    } else if (characterPrompts[selectedCharacter]) {
        prompt = characterPrompts[selectedCharacter];
    } else {
        prompt = `${selectedCharacter}として、「${exam.examName}」まであと${daysLeft}日。その性格で具体的アドバイスを180文字で。`;
    }

    try {
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set in environment variables');
            throw new Error('GEMINI_API_KEY is not set');
        }

        console.log(`Calling Gemini API with model: ${GEMINI_MODEL}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                maxOutputTokens: 2048, 
                temperature: 1.3
            }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });
        
        console.log('Gemini API response received successfully');
        console.log('Response:', JSON.stringify(response.data));

        const aiMessage = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (!aiMessage) {
            console.error('Candidates:', JSON.stringify(response.data.candidates));
            throw new Error('No AI message generated');
        }

        return `📚 **${exam.examName}** まであと **${daysLeft}日**\n🎭 **今日のキャラ**: ${selectedCharacter}\n\n${aiMessage}`;
    } catch (error) {
        console.error('Gemini error:', error?.response?.data || error.message);
        return `⚠️ **エラー通知**\n📚 **${exam.examName}** まであと **${daysLeft}日**\n\nメッセージの生成に失敗しました。\nGemini APIの設定を確認してください。\n\nエラー: ${error.message}`;
    }
}

async function sendNotification(exam, message) {
    const type = exam.notificationType || 'slack';
    const url = exam.notificationUrl || exam.slackWebhookUrl;
    
    if (!url) {
        console.log('No notification URL configured');
        return;
    }

    try {
        switch (type) {
            case 'slack':
            case 'discord':
                await axios.post(url, {
                    text: message,
                    username: 'カウントダウンBot',
                    icon_emoji: ':books:'
                });
                break;

            case 'line':
                await axios.post('https://notify-api.line.me/api/notify', 
                    `message=${encodeURIComponent(message)}`, {
                    headers: {
                        'Authorization': `Bearer ${url}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                break;

            case 'teams':
                await axios.post(url, {
                    text: message
                });
                break;

            default:
                console.error('Unknown notification type:', type);
        }
        console.log(`Notification sent via ${type}`);
    } catch (error) {
        console.error(`${type} notification error:`, error.message);
    }
}
