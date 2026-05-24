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
    console.log(`PATCHing task ${id} with body:`, body);
    
    // Diagnostic: Check if any tasks exist and what their IDs look like
    const count = await Task.countDocuments({});
    console.log(`Total tasks in DB: ${count}`);
    
    const task = await Task.findByIdAndUpdate(id, body, { new: true });
    
    if (!task) {
        console.error(`Task NOT FOUND for ID: ${id}`);
        // Try to find it by string if findById failed
        const foundByString = await Task.findOne({ _id: id });
        console.log(`Fallback search by string result: ${foundByString ? 'FOUND' : 'NOT FOUND'}`);
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

    console.log(`DELETING task ${id}`);
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
        console.error(`Task NOT FOUND for deletion: ${id}`);
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }



    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
