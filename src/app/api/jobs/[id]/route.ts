import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = await connectToDatabase();
    const body = await request.json();
    
    if (!db) {
      return NextResponse.json({ success: true, data: { ...body, _id: params.id, mockUpdated: true } });
    }
    
    const url = new URL(request.url);
    const idParts = url.pathname.split('/');
    const id = idParts[idParts.length - 1];
    
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
    if (!updatedJob) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = await connectToDatabase();
    
    if (!db) {
      return NextResponse.json({ success: true, data: { mockDeleted: true } });
    }
    
    const url = new URL(request.url);
    const idParts = url.pathname.split('/');
    const id = idParts[idParts.length - 1];
    
    const deletedJob = await Job.findByIdAndDelete(id);
    
    if (!deletedJob) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
