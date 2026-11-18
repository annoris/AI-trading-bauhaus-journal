"use client";

import { EquityArea } from "./charts/equity-area";
import { ChartAttribution, ChartBrandMark } from "./chart-branding";
import { FillPriceChart } from "./charts/trade-price-charts";
import { usePrivacy } from "./privacy";

export interface ChartExecution {
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: string;
}

export interface ChartTrade {
  key: string;
  symbol: string;
  assetClass?: string | null;
  direction: string;
  openedAt: string;
  closedAt?: string | null;
  netPnl: number;
  avgEntry: number;
  avgExit?: number | null;
}

/** The execution chart displays only recorded fills; market candles load separately on request. */
export function TradeChart({
  trade,
  executions,
  height = 420,
  timeZone = "UTC",
}: {
  trade: ChartTrade;
  executions: ChartExecution[];
  height?: number;
  timeZone?: string;
}) {
  const privateMode = usePrivacy();
  if (privateMode) {
    const data = [...executions]
      .sort((a, b) => a.executedAt.localeCompare(b.executedAt))
      .map((fill) => ({
        t: fill.executedAt,
        cumNetPnl: fill.price / trade.avgEntry - 1,
      }));
    return (
      <figure className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Execution price change (%)</p>
        {trade.avgEntry !== 0 && data.length ? (
          <div className="relative">
            <EquityArea
              data={data}
              height={height}
              valueFormat="percent"
              valueLabel="Price change from average entry"
            />
            <ChartBrandMark />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No execution prices available.</p>
        )}
        <figcaption className="mt-2 text-xs text-muted-foreground">
          Recorded fills as a percentage of average entry. Privacy mode keeps prices and monetary
          P&amp;L hidden.
        </figcaption>
      </figure>
    );
  }

  return (
    <figure>
      <div className="relative overflow-hidden rounded-lg border bg-card">
        {executions.length ? (
          <FillPriceChart
            trade={trade}
            executions={executions}
            timeZone={timeZone}
            height={height}
          />
        ) : (
          <div className="grid place-items-center text-sm text-muted-foreground" style={{ height }}>
            No execution prices available.
          </div>
        )}
        {executions.length > 0 && <ChartBrandMark />}
      </div>
      <figcaption className="mt-1.5 px-1 text-xs text-muted-foreground">
        Price path from recorded fills. To view market candles, choose a data source and load
        history in Market data &amp; replay.
        <span className="mt-1 block">
          <ChartAttribution />
        </span>
      </figcaption>
    </figure>
  );
}
