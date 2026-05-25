import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not connected' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    let query: any = {};
    if (status) query.status = status;
    if (source) query.source = source;

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not connected' }, { status: 500 });
    }

    const body = await request.json();
    const jobsToInsert = Array.isArray(body) ? body : [body];
    const newJobs = [];
    let duplicates = 0;

    for (const job of jobsToInsert) {
      const existing = job.url ? await Job.findOne({ url: job.url }) : null;
      if (!existing) {
        newJobs.push(job);
      } else {
        duplicates++;
      }
    }

    if (newJobs.length > 0) {
      const createdJobs = await Job.insertMany(newJobs);
      return NextResponse.json({
        success: true,
        message: `Inserted ${newJobs.length} jobs. Skipped ${duplicates} duplicates.`,
        data: createdJobs
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: true,
        message: `No new jobs to insert. Skipped ${duplicates} duplicates.`,
        data: []
      });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
