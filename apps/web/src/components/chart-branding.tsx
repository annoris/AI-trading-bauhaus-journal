import { BrandLogo } from "./brand-logo";

export function ChartBrandMark() {
  return (
    <div className="pointer-events-none absolute bottom-8 left-3 z-10">
      <BrandLogo className="h-9 w-24" />
    </div>
  );
}

export function ChartAttribution() {
  return <span className="text-xs text-muted-foreground">Trading Bauhaus</span>;
}
