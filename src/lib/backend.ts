// Auth is handled by the ue_auth httpOnly cookie — no manual token needed.
// The browser sends the cookie automatically on every same-origin fetch.
export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
