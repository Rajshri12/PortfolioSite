import webpush from "web-push";
import PushSubscription from "@/models/PushSubscription";
import connectToDatabase from "@/lib/mongodb";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || "mailto:admin@phoenix.local",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export function getPublicKey(): string | null {
  return process.env.WEB_PUSH_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Send to every device subscribed by this user. Returns delivery stats. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureConfigured()) return { sent: 0, failed: 0 };

  await connectToDatabase();
  const subs = await PushSubscription.find({ userId }).lean();
  if (subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = subscription expired or user uninstalled — prune it
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    })
  );

  return { sent, failed };
}
