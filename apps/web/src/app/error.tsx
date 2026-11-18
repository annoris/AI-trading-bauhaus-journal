"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Trading Bauhaus
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">This page could not load</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Try loading the page again. If you were saving a change, check whether it was saved before
        submitting it again.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to home</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/support">Contact support</Link>
        </Button>
      </div>
    </section>
  );
}
