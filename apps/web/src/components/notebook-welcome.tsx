import Image from "next/image";
import { BookOpen, Lightbulb, Target, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Welcome artwork supplied by the owner. */
export function NotebookWelcome({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bauhaus-notebook-welcome">
      <Image
        src="/images/notebook/trading_bauhaus_agenda.png"
        alt="Trading Bauhaus agenda and green pen"
        width={416}
        height={263}
        unoptimized
        priority
        className="bauhaus-notebook-art rounded-xl"
      />
      <h2 className="text-3xl font-semibold tracking-tight">Your space to reflect</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
        Keep your ideas, strategies and trading lessons in one place. Build a process you can return
        to every day.
      </p>
      <Button size="lg" className="mt-6" onClick={onCreate}>
        <Plus />
        Create a note
      </Button>
      <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Organize",
            description: "Give every idea a home in your folders.",
            icon: BookOpen,
          },
          {
            title: "Reflect",
            description: "Capture what you learn after each session.",
            icon: Lightbulb,
          },
          {
            title: "Improve",
            description: "Turn observations into a clearer trading plan.",
            icon: Target,
          },
          {
            title: "Grow",
            description: "Keep your lessons close as your process evolves.",
            icon: TrendingUp,
          },
        ].map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardContent className="pt-5">
              <span className="bauhaus-feature-icon">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
