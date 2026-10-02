"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/backend";

const HEARTBEAT_MS = 5 * 60 * 1000; // 5 min while the tab is visible

/**
 * Activity tracker — fires a page_view ping on every route change and a
 * heartbeat every 5 min while the tab is open. Renders nothing.
 */
export default function ActivityTracker() {
  const pathname = usePathname();
  const lastPagePing = useRef<string | null>(null);

  // Page view on route change
  useEffect(() => {
    if (!pathname) return;
    // Skip duplicate pings for the same path (e.g. search-param-only changes)
    if (lastPagePing.current === pathname) return;
    lastPagePing.current = pathname;

    apiFetch("/api/activity", {
      method: "POST",
      body: JSON.stringify({ event: "page_view", page: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  // Heartbeat while visible
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      apiFetch("/api/activity", {
        method: "POST",
        body: JSON.stringify({ event: "heartbeat", page: pathname ?? "" }),
        keepalive: true,
      }).catch(() => {});
    };

    const interval = setInterval(ping, HEARTBEAT_MS);
    // Also ping when the tab becomes visible again after being hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") ping();
    });

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
