import Image from "next/image";
import { cn } from "@/lib/utils";

/** Display the supplied logo without modifying the original artwork. */
export function BrandLogo({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={cn(
        "bauhaus-logo relative block h-14 w-44 shrink-0 overflow-hidden",
        animated && "brand-logo-motion",
        className,
      )}
    >
      <Image
        src="/images/notebook/trading_bauhaus_logo.png"
        alt="Trading Bauhaus"
        width={155}
        height={69}
        unoptimized
        priority
        className="h-full w-full object-contain"
      />
    </span>
  );
}
