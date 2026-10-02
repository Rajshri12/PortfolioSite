"use client";

/**
 * Tiny module-level event bus for gamification celebrations.
 * Any page can fire; CompassBar listens and renders the animations.
 */

export interface CoinEvent {
  amount: number;
  sourceId?: string; // e.g. task id — lets the caller position the float-up
  screenX?: number; // optional viewport coords to spawn the float-up from
  screenY?: number;
}

type Listener = (payload: any) => void;

const listeners = new Map<string, Set<Listener>>();

export function on(name: string, fn: Listener) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name)!.add(fn);
  return () => listeners.get(name)?.delete(fn);
}

export function emit(name: string, payload?: any) {
  listeners.get(name)?.forEach((fn) => fn(payload));
}

export const coinEvents = {
  award: (payload: CoinEvent) => emit("coins:award", payload),
  levelUp: (level: number) => emit("level:up", level),
  streakBroken: () => emit("streak:broken"),
};
