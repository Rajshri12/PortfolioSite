import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ success: false, error: 'Database not connected' }, { status: 500 });

    const body = await request.json();
    const updatedJob = await Job.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });

    if (!updatedJob) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ success: false, error: 'Database not connected' }, { status: 500 });

    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
