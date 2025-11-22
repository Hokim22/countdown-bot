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
    
    const characterMessages = {
        '明るい友人': [
            `えー！あと${daysLeft}日じゃん！めっちゃ楽しみだね〜🎉 一緒に頑張ろう〜✨`,
            `わあ〜！あと${daysLeft}日だね！ドキドキする〜😆 でも大丈夫！私も応援してるからね〜💕`
        ],
        '厳しいコーチ': [
            `まだまだだな。あと${daysLeft}日しかないぞ？💦 今日中に計画を立てろ！`,
            `${daysLeft}日後に後悔するなよ😏 毎日コツコツ積み重ねることが大事だ。`
        ],
        '優しい先輩': [
            `あと${daysLeft}日なのね〜 がんばってるのね！応援してるわよ〜🌸`,
            `お疲れさま〜。あと${daysLeft}日ね。無理しちゃダメよ？しっかり休憩も取ってね〜🌿`
        ],
        '未来の自分': [
            `おつかれ。あと${daysLeft}日だね。この経験が君を大きく成長させるんだ。頑張れ！🌟`,
            `やあ。あと${daysLeft}日か。今の努力が将来の自信につながるよ。自分を信じて進んでいこう。`
        ]
    };
    
    const messages = characterMessages[selectedCharacter];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const characterPrompts = {
        '明るい友人': `あなたは明るくポジティブな友人です。「〜だね！」「〜だよ！」という口調で話します。絵文字を使って楽しさを伝えます。${exam.examName}まであと${daysLeft}日です。実用的なアドバイスを明るく楽しく伝えてください。300文字程度で。`,
        '厳しいコーチ': `あなたは厳しいコーチです。「まだまだだな」「もっとできる」という厳しい口調ですが、最終的には応援してくれます。現実的で実践的なアドバイスをします。${exam.examName}まであと${daysLeft}日です。厳しくも実用的なアドバイスをください。300文字程度で。`,
        '優しい先輩': `あなたは優しい先輩です。「〜ですね」「〜ましょう」という丁寧な口調で、いつも母性的に心配してくれます。体調や休息のことも気遣ってくれます。${exam.examName}まであと${daysLeft}日です。優しく母性的にアドバイスしてください。300文字程度で。`,
        '未来の自分': `あなたは未来の自分です。落ち着いていて、「おつかれ」「君」「だね」などの口調で話します。経験者としての知恵と、将来への希望を伝えます。${exam.examName}まであと${daysLeft}日です。未来の視点からの深いアドバイスをください。300文字程度で。`
    };
    
    let prompt;
    if (customPrompt) {
        // カスタムプロンプトがある場合
        prompt = `あなたは${selectedCharacter}です。${customPrompt}
${exam.examName}まであと${daysLeft}日です。そのキャラクターらしく、実用的なアドバイス付きで応援する300文字程度のメッセージを作成してください。`;
    } else if (characterPrompts[selectedCharacter]) {
        // プリセットキャラクター
        prompt = characterPrompts[selectedCharacter];
    } else {
        // キャラクター名のみ指定（AIが自動で性格を考える）
        prompt = `あなたは${selectedCharacter}です。${exam.examName}まであと${daysLeft}日です。${selectedCharacter}らしい性格や口調で、実用的なアドバイス付きで応援する300文字程度のメッセージを作成してください。`;
    }

    try {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 400, temperature: 1.2 }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        const aiMessage = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || randomMessage;

        return `📚 **${exam.examName}** まであと **${daysLeft}日**\n🎭 **今日のキャラ**: ${selectedCharacter}\n${aiMessage}`;
    } catch (error) {
        console.error('Gemini error:', error?.response?.data || error.message);
        return `📚 **${exam.examName}** まであと **${daysLeft}日**\n🎭 **今日のキャラ**: ${selectedCharacter}\n${randomMessage}`;
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
