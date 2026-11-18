import type { EChartsOption } from "echarts";
import type { MarketBar, Resolution } from "@/lib/market-data";
import { RESOLUTIONS } from "@/lib/market-data";
import { formatTimestamp } from "@/lib/timezone";
import { fmtMoney, fmtNumber } from "@/lib/utils";
import type { VizTokens } from "./tokens";

export interface PriceFill {
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

const baseOption = (tokens: VizTokens): Pick<EChartsOption, "backgroundColor" | "tooltip"> => ({
  backgroundColor: "transparent",
  tooltip: {
    confine: true,
    trigger: "axis",
    axisPointer: { type: "cross" },
    backgroundColor: tokens.card,
    borderColor: tokens.border,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: tokens.foreground, fontSize: 12 },
    extraCssText: "border-radius:10px;line-height:1.5;",
  },
});

const stamp = (timestamp: string, timeZone: string) => formatTimestamp(timestamp, timeZone);

export function buildExecutionPriceOption(
  trade: FillChartTrade,
  executions: PriceFill[],
  tokens: VizTokens,
  timeZone: string,
): EChartsOption {
  const fills = [...executions].sort((a, b) => Date.parse(a.executedAt) - Date.parse(b.executedAt));
  const categories = fills.map((fill) => stamp(fill.executedAt, timeZone));
  const values = fills.map((fill) => fill.price);
  const buys = fills.flatMap((fill, index) =>
    fill.side === "buy"
      ? [{ name: `BUY ${fmtNumber(fill.quantity, 0)}`, value: [index, fill.price] }]
      : [],
  );
  const sells = fills.flatMap((fill, index) =>
    fill.side === "sell"
      ? [{ name: `SELL ${fmtNumber(fill.quantity, 0)}`, value: [index, fill.price] }]
      : [],
  );
  const last = fills.length - 1;
  const pnl =
    trade.closedAt && trade.avgExit != null && last >= 0
      ? [{ name: fmtMoney(trade.netPnl), value: [last, trade.avgExit] }]
      : [];

  return {
    ...baseOption(tokens),
    grid: { left: 64, right: 28, top: 24, bottom: 36 },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: tokens.baseline } },
      axisLabel: { color: tokens.inkMuted, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: {
        color: tokens.inkMuted,
        fontSize: 10,
        formatter: (value: number) => fmtNumber(value, 2),
      },
      splitLine: { lineStyle: { color: tokens.gridline } },
    },
    series: [
      {
        type: "line",
        name: trade.symbol,
        data: values,
        symbol: "none",
        connectNulls: false,
        lineStyle: { color: trade.netPnl >= 0 ? tokens.profit : tokens.loss, width: 2 },
      },
      {
        type: "scatter",
        name: "Buy fills",
        data: buys,
        symbol: "triangle",
        symbolSize: 10,
        itemStyle: { color: tokens.profit },
        label: {
          show: true,
          position: "bottom",
          formatter: "{b}",
          color: tokens.foreground,
          fontSize: 10,
        },
      },
      {
        type: "scatter",
        name: "Sell fills",
        data: sells,
        symbol: "triangle",
        symbolRotate: 180,
        symbolSize: 10,
        itemStyle: { color: tokens.loss },
        label: {
          show: true,
          position: "top",
          formatter: "{b}",
          color: tokens.foreground,
          fontSize: 10,
        },
      },
      {
        type: "scatter",
        name: "Net P&L",
        data: pnl,
        symbol: "none",
        label: {
          show: true,
          position: "right",
          formatter: "{b}",
          color: tokens.foreground,
          backgroundColor: trade.netPnl >= 0 ? tokens.profit : tokens.loss,
          borderRadius: 4,
          padding: [3, 6],
          fontSize: 11,
          fontWeight: "bold",
        },
      },
    ],
  };
}

const barIndexAt = (bars: MarketBar[], time: number): number => {
  let low = 0;
  let high = bars.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (bars[middle]!.time <= time) {
      result = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
};

export function buildMarketReplayOption(
  symbol: string,
  resolution: Resolution,
  bars: MarketBar[],
  fills: PriceFill[],
  tokens: VizTokens,
  timeZone: string,
): EChartsOption {
  const categories = bars.map((bar) => String(bar.time));
  const labels = bars.map((bar) => {
    const date = stamp(new Date(bar.time).toISOString(), timeZone);
    return resolution === "1d" ? date.slice(0, 10) : date.slice(5, 16);
  });
  const markerData = (side: PriceFill["side"]) =>
    fills.flatMap((fill) => {
      if (fill.side !== side) return [];
      const time = Date.parse(fill.executedAt);
      const index = barIndexAt(bars, time);
      const lastBar = bars.at(-1);
      if (!lastBar || index < 0 || time > lastBar.time + RESOLUTIONS[resolution]) return [];
      return [
        {
          name: `${side.toUpperCase()} ${fmtNumber(fill.quantity, 0)}`,
          value: [index, fill.price],
        },
      ];
    });

  return {
    ...baseOption(tokens),
    axisPointer: { link: [{ xAxisIndex: "all" }] },
    grid: [
      { left: 64, right: 18, top: 20, height: "61%" },
      { left: 64, right: 18, top: "75%", height: "13%" },
    ],
    xAxis: [
      {
        type: "category",
        data: categories,
        gridIndex: 0,
        axisLine: { lineStyle: { color: tokens.baseline } },
        axisLabel: { show: false },
        axisTick: { show: false },
      },
      {
        type: "category",
        data: labels,
        gridIndex: 1,
        axisLine: { lineStyle: { color: tokens.baseline } },
        axisLabel: { color: tokens.inkMuted, fontSize: 10, hideOverlap: true },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: "value",
        scale: true,
        gridIndex: 0,
        axisLabel: {
          color: tokens.inkMuted,
          fontSize: 10,
          formatter: (value: number) => fmtNumber(value, 2),
        },
        splitLine: { lineStyle: { color: tokens.gridline } },
      },
      {
        type: "value",
        gridIndex: 1,
        axisLabel: {
          color: tokens.inkMuted,
          fontSize: 9,
          formatter: (value: number) => fmtNumber(value, 0),
        },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], filterMode: "filter" },
      {
        type: "slider",
        xAxisIndex: [0, 1],
        height: 14,
        bottom: 2,
        borderColor: tokens.border,
        fillerColor: `${tokens.brand}33`,
        textStyle: { color: tokens.inkMuted, fontSize: 9 },
      },
    ],
    series: [
      {
        type: "candlestick",
        name: symbol,
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: bars.map((bar) => [bar.open, bar.close, bar.low, bar.high]),
        itemStyle: {
          color: tokens.profit,
          color0: tokens.loss,
          borderColor: tokens.profit,
          borderColor0: tokens.loss,
        },
      },
      {
        type: "scatter",
        name: "Buy fills",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: markerData("buy"),
        symbol: "triangle",
        symbolSize: 10,
        itemStyle: { color: tokens.profit },
        label: {
          show: true,
          position: "bottom",
          formatter: "{b}",
          color: tokens.foreground,
          fontSize: 9,
        },
      },
      {
        type: "scatter",
        name: "Sell fills",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: markerData("sell"),
        symbol: "triangle",
        symbolRotate: 180,
        symbolSize: 10,
        itemStyle: { color: tokens.loss },
        label: {
          show: true,
          position: "top",
          formatter: "{b}",
          color: tokens.foreground,
          fontSize: 9,
        },
      },
      {
        type: "bar",
        name: "Volume",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: bars.map((bar) => ({
          value: bar.volume,
          itemStyle: { color: bar.close >= bar.open ? tokens.profitFill : tokens.loss },
        })),
        barMaxWidth: 18,
      },
    ],
  };
}
