import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: true, data: [], isMock: true });
    }

    const tasks = await Task.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('API Error (GET /api/tasks):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    if (!db) {
        return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }
    const body = await request.json();
    const task = await Task.create(body);
    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    console.error('API Error (POST /api/tasks):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
