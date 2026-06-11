import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Task from '@/models/Task';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });

    const body = await request.json();
    const task = await Task.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }




    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
