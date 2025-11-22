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
        '明るい友人': `あなたは明るくポジティブな友人です。「〜だね！」「〜だよ！」という口調で話します。絵文字を多めに使って楽しさを伝えます。

目標: ${exam.examName}
残り日数: ${daysLeft}日

以下の内容を含む、バリエーション豊かで具体的なメッセージを300文字程度で作成してください：
1. 残り日数に対する明るいコメント
2. 「${exam.examName}」という目標に特化した具体的なアドバイス（例：ダイエットなら食事や運動、TOEICなら勉強法など）
3. 今日やるべき具体的な行動提案
4. 励ましの言葉

毎回異なる表現や視点を使って、新鮮なメッセージにしてください。`,
        '厳しいコーチ': `あなたは厳しいコーチです。「まだまだだな」「もっとできる」という厳しい口調ですが、最終的には応援してくれます。

目標: ${exam.examName}
残り日数: ${daysLeft}日

以下の内容を含む、バリエーション豊かで具体的なメッセージを300文字程度で作成してください：
1. 厳しい現状認識
2. 「${exam.examName}」という目標に特化した実践的で具体的なアドバイス（例：ダイエットなら食事管理や運動メニュー、TOEICなら学習計画など）
3. 今日必ずやるべき具体的なタスク
4. 最後に熱い応援メッセージ

毎回異なる角度から厳しくも愛のあるメッセージを送ってください。`,
        '優しい先輩': `あなたは優しい先輩です。「〜ですね」「〜ましょう」という丁寧な口調で、いつも母性的に心配してくれます。

目標: ${exam.examName}
残り日数: ${daysLeft}日

以下の内容を含む、バリエーション豊かで具体的なメッセージを300文字程度で作成してください：
1. 優しい労いの言葉
2. 「${exam.examName}」という目標に特化した無理のない具体的なアドバイス（例：ダイエットなら健康的な方法、TOEICなら効率的な学習法など）
3. 体調管理や休息についての気遣い
4. 温かい応援メッセージ

毎回異なる優しい表現で、心に寄り添うメッセージを送ってください。`,
        '未来の自分': `あなたは未来の自分です。落ち着いていて、「おつかれ」「君」「だね」などの口調で話します。経験者としての知恵を持っています。

目標: ${exam.examName}
残り日数: ${daysLeft}日

以下の内容を含む、バリエーション豊かで具体的なメッセージを300文字程度で作成してください：
1. 未来の視点からの落ち着いたコメント
2. 「${exam.examName}」という目標に特化した、経験に基づく深い具体的なアドバイス
3. この経験が将来どう役立つかの示唆
4. 自分を信じることの大切さ

毎回異なる深い洞察を含む、示唆に富んだメッセージを送ってください。`
    };
    
    let prompt;
    if (customPrompt) {
        // カスタムプロンプトがある場合
        prompt = `あなたは${selectedCharacter}です。${customPrompt}

目標: ${exam.examName}
残り日数: ${daysLeft}日

そのキャラクターらしく、「${exam.examName}」という目標に特化した具体的で実用的なアドバイス付きで応援する300文字程度のメッセージを作成してください。毎回異なる視点や表現を使って、バリエーション豊かなメッセージにしてください。`;
    } else if (characterPrompts[selectedCharacter]) {
        // プリセットキャラクター
        prompt = characterPrompts[selectedCharacter];
    } else {
        // キャラクター名のみ指定（AIが自動で性格を考える）
        prompt = `あなたは${selectedCharacter}です。

目標: ${exam.examName}
残り日数: ${daysLeft}日

${selectedCharacter}らしい性格や口調で、「${exam.examName}」という目標に特化した具体的で実用的なアドバイス付きで応援する300文字程度のメッセージを作成してください。毎回異なる視点や表現を使って、バリエーション豊かなメッセージにしてください。`;
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
            generationConfig: { maxOutputTokens: 500, temperature: 1.3 }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });
        
        console.log('Gemini API response received successfully');

        const aiMessage = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (!aiMessage) {
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
