"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { MarketBar, Resolution } from "@/lib/market-data";
import { buildExecutionPriceOption, buildMarketReplayOption } from "./price-chart-options";
import { useVizTokens } from "./tokens";

const EChart = dynamic(() => import("./echart").then((module) => module.EChart), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[180px] place-items-center text-sm text-muted-foreground">
      Preparing chart…
    </div>
  ),
});

export interface PriceChartFill {
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: string;
}

export interface FillChartTrade {
  symbol: string;
  netPnl: number;
  avgEntry: number;
  avgExit?: number | null;
  closedAt?: string | null;
}

export function FillPriceChart({
  trade,
  executions,
  timeZone,
  height,
}: {
  trade: FillChartTrade;
  executions: PriceChartFill[];
  timeZone: string;
  height: number;
}) {
  const tokens = useVizTokens();
  const option = useMemo(
    () => (tokens ? buildExecutionPriceOption(trade, executions, tokens, timeZone) : null),
    [trade, executions, timeZone, tokens],
  );
  if (!option)
    return <div className="grid place-items-center text-sm text-muted-foreground" style={{ height }} />;
  return <EChart option={option} height={height} />;
}

export function CandleReplayChart({
  symbol,
  resolution,
  bars,
  fills,
  timeZone,
  onReady,
}: {
  symbol: string;
  resolution: Resolution;
  bars: MarketBar[];
  fills: PriceChartFill[];
  timeZone: string;
  onReady?: () => void;
}) {
  const tokens = useVizTokens();
  const option = useMemo(
    () =>
      tokens ? buildMarketReplayOption(symbol, resolution, bars, fills, tokens, timeZone) : null,
    [symbol, resolution, bars, fills, timeZone, tokens],
  );
  if (!option)
    return (
      <div className="grid h-[420px] place-items-center text-sm text-muted-foreground" role="status">
        Preparing candle replay…
      </div>
    );
  return <EChart option={option} height={420} onReady={onReady} />;
}
