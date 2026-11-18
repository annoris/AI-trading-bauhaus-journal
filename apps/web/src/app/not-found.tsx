import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        This address is unavailable. Check the link, or return home to open your journal.
      </p>
      <div>
        <Button asChild>
          <Link href="/">Go to home</Link>
        </Button>
      </div>
    </section>
  );
}
