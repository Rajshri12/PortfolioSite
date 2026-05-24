"use client";

import { useEffect } from "react";

export default function DevTokenInit() {
  useEffect(() => {
    if (localStorage.getItem("ue_token")) return;
    fetch("/api/dev-token")
      .then((r) => r.json())
      .then(({ token }) => {
        if (token) localStorage.setItem("ue_token", token);
      });
  }, []);
  return null;
}
