"use client";

import { useEffect, useState } from "react";

/** Tracks browser connectivity. Payments are never queued offline — the UI shows a
 * "no connection" state instead so nothing silently gets lost or double-submitted. */
export function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
