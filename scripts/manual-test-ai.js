require('dotenv').config({ path: '.env.local' });

async function testAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('Testing OpenAI with Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

    if (!apiKey) {
        console.error('Error: OPENAI_API_KEY is not defined in .env.local');
        return;
    }

    try {
        console.log('Sending request to OpenAI...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: 'Say hello' }],
                max_tokens: 5
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            console.log('✅ OpenAI Response:', data.choices[0].message.content);
        } else {
            console.log('❌ OpenAI Error:', data);
        }
    } catch (err) {
        console.error('❌ AI Call Failed:', err);
    }
}

testAI();
