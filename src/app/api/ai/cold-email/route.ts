import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { jobTitle, company, recruiterName, recruiterTitle, myName, myBackground, jobUrl, tone } = await request.json();

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        subject: `Interest in ${jobTitle} at ${company}`,
        body: `Hi ${recruiterName || 'there'},\n\nI came across the ${jobTitle} role at ${company} and I'm very excited about it.\n\nI'm ${myName || 'a backend engineer'} with ${myBackground || 'experience in Python and AI systems'}. I believe my background aligns well with what you're looking for.\n\nI'd love to connect and learn more about the team and the role. Would you be open to a quick 15-minute chat?\n\nBest regards,\n${myName || 'Rajshri'}\n\n[Note: OpenAI key not configured — this is a demo template]`,
        mock: true,
      });
    }

    const prompt = `Write a ${tone || 'professional and concise'} cold email from a job seeker to a recruiter.

Context:
- Job seeker's name: ${myName || 'Rajshri'}
- Background: ${myBackground || 'Backend Python developer transitioning to AI engineering, with FastAPI, LangChain, and RAG experience'}
- Target role: ${jobTitle} at ${company}
- Recruiter name: ${recruiterName || 'the hiring manager'}
- Recruiter title: ${recruiterTitle || 'Recruiter'}
- Job URL: ${jobUrl || 'N/A'}

Requirements:
- Subject line: punchy, specific, not generic
- Email body: 3-4 short paragraphs
- Opening: hook with a specific reason for reaching out to THIS company
- Middle: 2-3 concrete, relevant accomplishments/skills tied to the role
- Close: clear, low-friction CTA (15-min call)
- Tone: ${tone || 'warm but professional, confident not desperate'}
- Length: under 200 words for the body
- Do NOT use "I hope this email finds you well" or any clichés

Return JSON: { "subject": "...", "body": "..." }`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await res.json();
    const { subject, body } = JSON.parse(data.choices[0].message.content);
    return NextResponse.json({ success: true, subject, body });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
