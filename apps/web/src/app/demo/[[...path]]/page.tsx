"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function DemoEntry() {
  const params = useParams<{ path?: string[] }>();
  const path = params.path ?? [];

  useEffect(() => {
    const isExit = path.length === 1 && path[0] === "exit";
    const destination = isExit
      ? "/"
      : path.length === 0
        ? "/dashboard"
        : `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
    const query = isExit ? "" : window.location.search;
    window.location.replace(`${destination}${query}`);
  }, [path]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Opening the example workspace…
      </p>
    </main>
  );
}
