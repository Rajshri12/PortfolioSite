import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

// High quality mock data for presentation
const MOCK_JOBS = [
  {
    _id: "m1",
    title: "Junior AI Engineer",
    company: "OpenAI",
    url: "https://openai.com/careers",
    source: "scraper",
    status: "interviewing",
    reasoning: "Excellent match for your LLM and Python background.",
    appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "m2",
    title: "Backend Developer (Python)",
    company: "Stripe",
    url: "https://stripe.com/jobs",
    source: "manual",
    status: "applied",
    notes: "Got a referral from Sarah. Really great compensation package.",
    appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "m3",
    title: "Software Engineer, API",
    company: "Discord",
    url: "https://discord.com/jobs",
    source: "scraper",
    status: "new",
    reasoning: "0-2 years of experience required. Strong API development needed.",
    createdAt: new Date(),
  },
  {
    _id: "m4",
    title: "AI Integrations Engineer",
    company: "Anthropic",
    url: "https://anthropic.com",
    source: "scraper",
    status: "offer",
    reasoning: "Building agentic workflows.",
    appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "m5",
    title: "Backend Engineer II",
    company: "Spotify",
    url: "https://spotify.com",
    source: "manual",
    status: "rejected",
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  }
];

export async function GET(request: Request) {
  try {
    const db = await connectToDatabase();
    
    // Use mock data if no DB connected
    if (!db) {
      return NextResponse.json({ success: true, data: MOCK_JOBS, isMock: true });
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
    const body = await request.json();
    
    if (!db) {
      return NextResponse.json({ 
        success: true, 
        message: "Mock mode: simulated saving.",
        data: Array.isArray(body) ? body : [body]
      }, { status: 201 });
    }
    
    const jobsToInsert = Array.isArray(body) ? body : [body];
    const newJobs = [];
    let duplicates = 0;
    
    for (const job of jobsToInsert) {
      const existing = await Job.findOne({ url: job.url });
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
