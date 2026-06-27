import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    const userId = session.impersonating ?? session.userId;
    const query: any = { userId };
    if (status) query.status = status;
    if (source) query.source = source;

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await request.json();
    const userId = session.impersonating ?? session.userId;
    const jobsToInsert = Array.isArray(body) ? body : [body];
    const newJobs = [];
    let duplicates = 0;

    for (const job of jobsToInsert) {
      const existing = job.url ? await Job.findOne({ url: job.url, userId }) : null;
      if (!existing) {
        const initialStatus = job.status ?? 'new';
        newJobs.push({
          ...job,
          userId,
          status: initialStatus,
          stageHistory: [{ stage: initialStatus, date: new Date() }],
        });
      } else {
        duplicates++;
      }
    }

    if (newJobs.length > 0) {
      const createdJobs = await Job.insertMany(newJobs);
      return NextResponse.json({
        success: true,
        message: `Inserted ${newJobs.length} jobs. Skipped ${duplicates} duplicates.`,
        data: createdJobs,
      }, { status: 201 });
    }
    return NextResponse.json({
      success: true,
      message: `No new jobs to insert. Skipped ${duplicates} duplicates.`,
      data: [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
