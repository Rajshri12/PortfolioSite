import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';
import { getSession } from '@/lib/auth';
import { awardCoins, getGameConfig } from '@/lib/coins';
import { checkAndAwardBadges } from '@/lib/badges';
import { sendTelegram, getAdminChatId } from '@/lib/telegram';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await connectToDatabase();
    const body = await request.json();
    const userId = session.impersonating ?? session.userId;

    // Detect cold email being marked sent for the first time
    const isColdEmailSent =
      body.coldEmail?.sent === true &&
      typeof body.coldEmail?.subject === 'string';

    // Check prior state so we only award once
    const existingJob = isColdEmailSent
      ? await Job.findOne({ _id: id, userId }).lean()
      : null;
    const wasAlreadySent = (existingJob as any)?.coldEmail?.sent === true;

    const update: any = { $set: body };
    if (body.status) {
      update.$push = {
        stageHistory: { stage: body.status, date: new Date(), notes: body._stageNote ?? undefined },
      };
      delete update.$set._stageNote;
      if (body.status === 'applied' && !body.appliedAt) {
        update.$set.appliedAt = new Date();
      }
    }

    const updatedJob = await Job.findOneAndUpdate(
      { _id: id, userId },
      update,
      { new: true, runValidators: true }
    );
    if (!updatedJob) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

    // Award coins + badge only on the first send
    let coinsAwarded = 0;
    let newBadges: Array<{ slug: string; title: string; emoji: string }> = [];
    if (isColdEmailSent && !wasAlreadySent) {
      const config = await getGameConfig();
      const reward = config.bonusActions.coldEmailSent ?? 30;
      if (reward > 0) {
        const result = await awardCoins(userId, reward, 'cold_email', 'Cold email sent');
        coinsAwarded = result.awarded;
      }
      newBadges = await checkAndAwardBadges(userId, 'cold_email_sent');
      const company = (updatedJob as any).company ?? "a company";
      getAdminChatId().then((chatId) => {
        if (chatId) sendTelegram(chatId, `🧊 <b>Cold email sent</b>\n\nTo: <b>${company}</b>\nSubject: ${body.coldEmail.subject}\n\n🪙 +${coinsAwarded} coins awarded to user1.`);
      });
    }

    return NextResponse.json({ success: true, data: updatedJob, coinsAwarded, newBadges });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const deletedJob = await Job.findOneAndDelete({ _id: id, userId });
    if (!deletedJob) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
