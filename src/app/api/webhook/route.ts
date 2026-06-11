import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.WEBHOOK_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { job, files, meta } = body ?? {};
  if (!job?.url) {
    return NextResponse.json({ error: 'Missing job.url' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const update = {
      title: job.title,
      company: job.company,
      applyUrl: job.apply_url,
      location: job.location,
      salary: job.salary,
      score: job.score ?? undefined,
      scoreReasoning: job.score_reasoning,
      legitimacy: job.legitimacy,
      receivedAt: job.discovered_at ? new Date(job.discovered_at) : new Date(),
      notifyType: meta?.notify_type,
      resumeUrl: files?.resume_url,
      coverLetterUrl: files?.cover_letter_url,
      filesExpireAt: files?.expires_at ? new Date(files.expires_at) : undefined,
    };

    const result = await Job.findOneAndUpdate(
      { url: job.url },
      {
        $set: update,
        $setOnInsert: {
          url: job.url,
          source: 'scraper',
          status: 'new',
          priority: 'medium',
          tags: [],
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ ok: true, id: result._id });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
