import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Task from '@/models/Task';
import Job from '@/models/Job';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: "OpenAI API Key not configured" }, { status: 500 });
  }

  try {
    const { mode } = await request.json();
    const db = await connectToDatabase();
    
    let tasks = [];
    let jobs = [];
    
    if (db) {
      tasks = await Task.find({}).limit(50);
      jobs = await Job.find({}).limit(50);
    }

    const prompt = mode === 'insight' 
      ? `You are an AI Career Coach. Provide a short, powerful, and strategic motivational insight (1 sentence) for a "Visionary" professional to start their day. 
         ${jobs.length > 0 || tasks.length > 0 
           ? `Context: ${jobs.length} jobs tracked, ${tasks.length} missions logged.` 
           : "Context: The user is just starting their journey today."}
         Return JSON: { "insight": "..." }`
      : `You are an AI Career Coach. Based on the "Visionary" user's progress, provide 3-5 suggested missions for tomorrow.
         ${tasks.length > 0 
           ? `Recent Missions: ${tasks.slice(0, 5).map(t => t.text).join(', ')}` 
           : "Context: User has no missions yet. Suggest starting with high-impact job search tasks."}
         Return JSON: { "suggestions": [{ "text": "...", "category": "learning"|"job-search", "type": "daily"|"custom" }] }`;


    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const aiContent = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ success: true, ...aiContent });
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
