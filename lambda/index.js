const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const axios = require('axios');

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const bedrockClient = new BedrockRuntimeClient({ region: 'ap-northeast-1' });

exports.handler = async (event) => {
    try {
        // DynamoDBから試験データを取得
        const scanCommand = new ScanCommand({
            TableName: process.env.DYNAMODB_TABLE
        });
        
        const result = await dynamoClient.send(scanCommand);
        const exams = result.Items.map(item => unmarshall(item));
        
        for (const exam of exams) {
            await processExam(exam);
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
        // 生成AIでメッセージ作成
        message = await generateMessage(exam, diffDays);
    } else if (diffDays === 0) {
        message = `🎯 **${exam.examName}** 本日が試験日です！頑張って！`;
    } else {
        message = `✅ **${exam.examName}** お疲れ様でした！`;
    }
    
    // Slackに投稿
    if (exam.slackWebhookUrl) {
        await sendToSlack(exam.slackWebhookUrl, message);
    }
}

async function generateMessage(exam, daysLeft) {
    // キャラクターリストからランダム選択
    const characters = [
        '天真爛漫な友人',
        '毒舌系フリーター',
        '近所の優しい甘いお姉さん',
        '推しのアイドル',
        '未来の自分',
        '競い合うライバル',
        '守護霊',
        '温かい家族'
    ];
    
    const selectedCharacter = characters[Math.floor(Math.random() * characters.length)];
    
    // キャラクター別メッセージ
    const characterMessages = {
        '天真爛漫な友人': [
            `えー！あと${daysLeft}日じゃん！めっちゃ楽しみだね〜🎉 スライド作りはカラフルにしよう！絵文字やイラストをたくさん使って、みんなが笑顔になるような発表にしようね！一緒に頑張ろう〜✨`,
            `わあ〜！あと${daysLeft}日で発表だね！ドキドキする〜😆 でも大丈夫！笑顔で話せばみんなきっと聞いてくれるよ！失敗してもそれも思い出だから、楽しんでいこう〜！私も応援してるからね〜💕`
        ],
        '毒舌系フリーター': [
            `はぁ？まだスライド作ってないの？あと${daysLeft}日しかないよ？💦 まずはアウトライン作成から始めなよ。「なぜ→何を→どうやって→結果」の流れで構成すれば聞き手も理解しやすいから。今日中に骨組みだけでも完成させな！`,
            `${daysLeft}日後に恥かくのはアンタだからね〜😏 声に出してリハーサルしなよ。鏡の前で練習すると表情も確認できるし、本番で緊張しないから。あと、「えーっと」とか言わないよう気をつけな。聞いてる方がイライラするから。`
        ],
        '近所の優しい甘いお姉さん': [
            `あら、あと${daysLeft}日なのね〜♡ がんばってるのね！お姉さんも応援してるわよ〜🌸 スライドは見やすさを大切にしてね。文字は大きめに、色は優しい色合いで。緑茶とお菓子用意しておくから、終わったらおうちにおいでね♡`,
            `お疲れさま〜。あと${daysLeft}日で発表なのね。無理しちゃダメよ？しっかり休憩も取ってね〜🌿 リハーサルの時は深呼吸して、落ち着いて話すのがコツよ。きっと素敵な発表になるわ。お姉さんがついてるから安心してね♡`
        ],
        '推しのアイドル': [
            `みんな〜！あと${daysLeft}日で発表だね！キラキラ✨ ファンのみんなに素敵な姿を見せてね！スライドはカラフルに、笑顔で元気よく発表して！みんなが応援してるから、自信を持って頑張ってね〜🎆 ファイトー！`,
            `おつかれさま〜！あと${daysLeft}日でステージに立つのね！ドキドキする〜💖 ステージでは笑顔が一番大切！緑張したら深呼吸して、みんなのことを思い出してね。きっと素敵なパフォーマンスになるよ！私も応援してるからね〜✨`
        ],
        '未来の自分': [
            `おつかれ。あと${daysLeft}日で発表だね。未来の君から伝えるよ。この経験が君を大きく成長させるんだ。失敗を恐れず、自分の言葉で伝えることを大切にして。今の努力が将来の自信につながるから。頑張れ！🌟`,
            `やあ。あと${daysLeft}日か。懐かしいな、この時期。未来の君はこの発表をきっかけに、もっと大きなステージで活躍してるよ。今は不安かもしれないけど、その不安も含めて全部が財産になる。自分を信じて進んでいこう。`
        ],
        '競い合うライバル': [
            `ふん、あと${daysLeft}日か。まさか私よりいい発表するつもり？😤 まあ、君の実力ならそこそこの発表になるだろうけどね。でも油断は禁物だよ。データと根拠をしっかり用意して、私を驚かせてみなよ。負けないからね！`,
            `お、あと${daysLeft}日で発表だね。最近の君の成長ぶり、正直認めざるを得ないよ。でも、まだまだ甘いね。プレゼンは戦いだ。相手の心をつかむための戦略を練りなさい。私も負けてられないから、お互いベストを尽くそう。`
        ],
        '守護霊': [
            `ふむ。あと${daysLeft}日であるな。汝よ、汝の成長を見守ってきた。この発表も汝の人生において大切な一歩であろう。心を落ち着け、自分の内なる声に耳を傾けよ。真実を語れば、必ず伝わる。汝の後ろにはいつも私がいる。安心せよ。🙏`,
            `汝よ。あと${daysLeft}日であるな。汝の努力、しかと見守っておるぞ。不安になった時は、深く息を吸い、心を静めよ。汝の中には既に答えがある。それを信じて、素直に語ればよい。汝の言葉には力がある。その力を信じよ。`
        ],
        '温かい家族': [
            `お疲れさま！あと${daysLeft}日で発表なのね。家族みんなで応援してるわよ〜🌸 どんな結果でも、あなたが一生懸命頑張ったことを私たちは誇りに思ってるの。無理しないで、体調管理も大切にしてね。終わったらみんなでお祝いしましょうね♡`,
            `あと${daysLeft}日なのね。最近よく頑張ってる姿を見ていて、本当に成長したなぁって思うわ。あなたのその努力する姿勢、家族みんなが学んでるのよ。緊張したら、家族のことを思い出してね。いつでもあなたの味方だから。頑張って！🌿`
        ]
    };
    
    const messages = characterMessages[selectedCharacter];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    try {
        // Bedrockを試す（失敗したらローカルメッセージ使用）
        // キャラクター別の詳細プロンプト
        const characterPrompts = {
            '天真爛漫な友人': `あなたは天真爛漫で明るい友人です。いつもポジティブで、「〜だね！」「〜だよ！」という口調で話します。絵文字をたくさん使って、楽しさを伝えます。${exam.examName}まであと${daysLeft}日です。実用的なアドバイスを明るく楽しく伝えてください。150文字程度で。`,
            '毒舌系フリーター': `あなたは毒舌系のフリーターです。「はぁ？」「〜だからね〜」「知らんけど」などの口調で、毒舌だけど最終的には応援してくれます。現実的でシニカルな視点で物事を言います。${exam.examName}まであと${daysLeft}日です。毒舌だけど実用的なアドバイスをしてください。150文字程度で。`,
            '近所の優しい甘いお姉さん': `あなたは近所の優しいお姉さんです。「あら〜」「〜ね♡」「お疲れさま」などの甘い口調で、いつも母性的に心配してくれます。お菓子やお茶の話もします。${exam.examName}まであと${daysLeft}日です。優しく母性的にアドバイスしてください。150文字程度で。`,
            '推しのアイドル': `あなたはアイドルです。「みんな〜！」「ファイトー！」「キラキラ✨」などの可愛い口調で、ファンへの愛を込めて話します。ステージやパフォーマンスの話もします。${exam.examName}まであと${daysLeft}日です。アイドルらしくキラキラした応援メッセージをください。150文字程度で。`,
            '未来の自分': `あなたは未来の自分です。落ち着いていて、「おつかれ」「君」「だね」などの口調で話します。経験者としての知恵と、将来への希望を伝えます。${exam.examName}まであと${daysLeft}日です。未来の視点からの深いアドバイスをください。150文字程度で。`,
            '競い合うライバル': `あなたはライバルです。「ふん」「まさか」「負けないからね」などの挑戦的な口調で、競争心を燃やします。相手を認めつつも、自分も負けていられないという気持ちです。${exam.examName}まであと${daysLeft}日です。ライバルらしく挑戦的なアドバイスをください。150文字程度で。`,
            '守護霊': `あなたは守護霊です。「ふむ」「汝よ」「ぞ」などの古風な口調で、神秘的で精神的な存在です。長い間見守ってきた経験から、深い知恵を授けます。${exam.examName}まであと${daysLeft}日です。守護霊らしく精神的なアドバイスをください。150文字程度で。`,
            '温かい家族': `あなたは温かい家族です。「お疲れさま」「あなた」「〜のよ」などの家族らしい温かい口調で、無条件の愛情を持っています。体調や生活を心配し、いつでも味方です。${exam.examName}まであと${daysLeft}日です。家族らしい温かいアドバイスをください。150文字程度で。`
        };
        
        const prompt = characterPrompts[selectedCharacter] || `あなたは${selectedCharacter}です。${exam.examName}まであと${daysLeft}日です。実用的なアドバイス付きで応援する150文字程度のメッセージを作成してください。`;

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            }),
            contentType: 'application/json'
        });
        
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiMessage = responseBody.content[0].text;
        
        return `📚 **${exam.examName}** まであと **${daysLeft}日**\n🎭 **今日のキャラ**: ${selectedCharacter}\n${aiMessage}`;
    } catch (error) {
        console.error('Bedrock error:', error);
        // ローカルのキャラクターメッセージを使用
        return `📚 **${exam.examName}** まであと **${daysLeft}日**\n🎭 **今日のキャラ**: ${selectedCharacter}\n${randomMessage}`;
    }
}

async function sendToSlack(webhookUrl, message) {
    try {
        await axios.post(webhookUrl, {
            text: message,
            username: 'カウントダウンBot',
            icon_emoji: ':books:'
        });
    } catch (error) {
        console.error('Slack error:', error);
    }
}