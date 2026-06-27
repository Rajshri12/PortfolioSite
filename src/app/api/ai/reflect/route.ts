import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { content, mood } = await request.json();

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        reflection: "Every entry you write is proof that you're serious about this path. The fact that you showed up today — that you reflected — that already puts you ahead. Keep going.",
        mock: true,
      });
    }

    const prompt = `You are a warm, perceptive mentor reading a job seeker's journal entry. They are learning AI engineering and actively searching for their first AI/backend role.

Mood today: ${mood ?? 'not specified'}

Their journal entry:
"""
${content}
"""

Write a thoughtful 2-3 sentence reflection that:
- Acknowledges something *specific* from what they wrote (not generic)
- Offers one genuine insight or reframe that might shift their perspective
- Ends with a brief, real encouragement — not corporate-speak, not hollow positivity

Rules: Plain text only. No bullet points. Be human and direct, not a life coach cliché.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    return NextResponse.json({ success: true, reflection: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
