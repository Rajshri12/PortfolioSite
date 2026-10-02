export async function register() {
  // Only arm the scheduler in the Node.js server runtime (skip edge/middleware)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkAndSendDuePushes } = await import("@/lib/pushScheduler");

  const TICK_MS = 60_000;

  async function tick() {
    try {
      const result = await checkAndSendDuePushes();
      if (result.sent > 0 || result.failed > 0) {
        console.log(`[push-scheduler] sent=${result.sent} failed=${result.failed}`);
      }
    } catch (err) {
      console.error("[push-scheduler] tick error:", err);
    }
  }

  setInterval(tick, TICK_MS);
  console.log("[push-scheduler] armed — ticking every 60s");
}
