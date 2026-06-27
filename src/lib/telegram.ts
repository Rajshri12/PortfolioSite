import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export async function getAdminChatId(): Promise<string | null> {
  try {
    await connectToDatabase();
    const user = await User.findOne({ userId: "admin" }).lean();
    return user?.telegramChatId ?? null;
  } catch {
    return null;
  }
}

export async function getUserChatId(): Promise<string | null> {
  try {
    await connectToDatabase();
    const user = await User.findOne({ userId: "user1" }).lean();
    return user?.telegramChatId ?? null;
  } catch {
    return null;
  }
}
