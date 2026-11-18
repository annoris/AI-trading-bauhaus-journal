// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TradeRating } from "../src/components/trade-rating";
import { TradeChart } from "../src/components/trade-chart";
import { TooltipProvider } from "../src/components/ui/tooltip";
import type { TradeMarketResult } from "../src/lib/market-data";

const replayChart = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock("../src/components/charts/trade-price-charts", () => ({
  FillPriceChart: () => null,
  CandleReplayChart: (props: { bars: unknown[]; fills: unknown[] }) => {
    replayChart.render(props);
    return null;
  },
}));
vi.mock("../src/components/privacy", () => ({ usePrivacy: () => false }));
const { HistoricalReplay } = await import("../src/components/trade-market-data");
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  replayChart.render.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const button = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const filled = () => container.querySelectorAll('[data-filled="true"]').length;

it("keeps the Trading Bauhaus logo watermark inside the execution chart", async () => {
  await act(async () =>
    root.render(
      createElement(TradeChart, {
        trade: {
          key: "watermark",
          symbol: "MNQ",
          direction: "long",
          openedAt: "2026-09-01T10:00:00Z",
          netPnl: 10,
          avgEntry: 100,
          avgExit: 101,
          closedAt: "2026-09-01T10:01:00Z",
        },
        executions: [
          { side: "buy", quantity: 1, price: 100, executedAt: "2026-09-01T10:00:00Z" },
          { side: "sell", quantity: 1, price: 101, executedAt: "2026-09-01T10:01:00Z" },
        ],
      }),
    ),
  );
  expect(container.querySelector('.bauhaus-logo img[alt="Trading Bauhaus"]')).toBeTruthy();
  expect(container.querySelector(".absolute.bottom-8.left-3.z-10")).toBeTruthy();
});

it("previews all stars up to the hovered or focused rating without saving", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(createElement(TradeRating, { value: 2, onChange: save })));
  await act(async () =>
    button("Rate 4 stars").dispatchEvent(new MouseEvent("pointerover", { bubbles: true })),
  );
  expect(filled()).toBe(4);
  expect(save).not.toHaveBeenCalled();
  await act(async () =>
    button("Rate 4 stars").dispatchEvent(
      new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body }),
    ),
  );
  expect(filled()).toBe(2);
  await act(async () => button("Rate 5 stars").focus());
  expect(filled()).toBe(5);
  await act(async () => button("Rate 5 stars").blur());
  expect(filled()).toBe(2);
});

it("animates the selection immediately and restores the saved value if saving fails", async () => {
  let reject!: (error: Error) => void;
  const save = vi.fn(
    () =>
      new Promise<void>((_, no) => {
        reject = no;
      }),
  );
  await act(async () => root.render(createElement(TradeRating, { value: 2, onChange: save })));
  await act(async () => button("Rate 4 stars").click());
  expect(save).toHaveBeenCalledWith(4);
  expect(filled()).toBe(4);
  expect(container.querySelectorAll(".journal-rating-selected")).toHaveLength(4);
  await act(async () => reject(new Error("offline")));
  expect(filled()).toBe(2);
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("not saved");
});

it("saves a rating and allows selecting it again to clear it", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(createElement(TradeRating, { value: null, onChange: save })));
  await act(async () => button("Rate 3 stars").click());
  expect(button("Rate 3 stars").getAttribute("aria-pressed")).toBe("true");
  await act(async () => button("Rate 3 stars").click());
  expect(save.mock.calls.map(([value]) => value)).toEqual([3, null]);
  expect(filled()).toBe(0);
});

const history: TradeMarketResult = {
  provider: "Test provider",
  symbol: "TEST",
  resolution: "1m",
  fetchedAt: "2026-09-01T12:00:00Z",
  truncated: false,
  warnings: [],
  bars: [0, 1, 2].map((index) => ({
    time: Date.parse("2026-09-01T10:00:00Z") + index * 60000,
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 10,
  })),
  estimate: { mae: -1, mfe: 2, sampledBars: 3, excludedBars: 0, warnings: [] },
};
const replayExecutions = [
  { side: "buy" as const, quantity: 1, price: 100, executedAt: "2026-09-01T10:00:30Z" },
  { side: "sell" as const, quantity: 1, price: 101, executedAt: "2026-09-01T10:02:30Z" },
];
const renderReplay = async (privacy = false) =>
  act(async () =>
    root.render(
      createElement(
        TooltipProvider,
        null,
        createElement(HistoricalReplay, {
          history,
          privacy,
          executions: replayExecutions,
          trade: {
            key: "test",
            symbol: "TEST",
            currency: "USD",
            netPnl: 1,
            avgEntry: 100,
            direction: "long",
            openedAt: "2026-09-01T10:00:00Z",
            closedAt: "2026-09-01T10:03:00Z",
          },
        }),
      ),
    ),
  );
const count = () =>
  container.querySelector<HTMLInputElement>('[aria-label="Replay position"]')!.value;
it("steps the ECharts replay without passing unrevealed candles or fills", async () => {
  await renderReplay();
  expect(count()).toBe("3");
  expect(button("Next candle").disabled).toBe(true);
  expect(replayChart.render.mock.lastCall?.[0].bars).toEqual(history.bars);
  expect(replayChart.render.mock.lastCall?.[0].fills).toHaveLength(2);
  await act(async () => button("Previous candle").click());
  expect(count()).toBe("2");
  expect(replayChart.render.mock.lastCall?.[0].bars).toEqual(history.bars.slice(0, 2));
  expect(replayChart.render.mock.lastCall?.[0].fills).toEqual([replayExecutions[0]]);
  await act(async () => button("Previous candle").click());
  expect(count()).toBe("1");
  expect(replayChart.render.mock.lastCall?.[0].bars).toEqual(history.bars.slice(0, 1));
  expect(replayChart.render.mock.lastCall?.[0].fills).toEqual([replayExecutions[0]]);
  expect(button("Previous candle").disabled).toBe(true);
  await act(async () => button("Next candle").click());
  expect(count()).toBe("2");
  expect(replayChart.render.mock.lastCall?.[0].bars).toEqual(history.bars.slice(0, 2));
  await act(async () => button("Show all candles").click());
  expect(count()).toBe("3");
  await act(async () => button("Restart replay").click());
  expect(count()).toBe("1");
  expect(replayChart.render.mock.lastCall?.[0].bars).toEqual(history.bars.slice(0, 1));
});
it("hides the historical chart and controls in privacy mode", async () => {
  await renderReplay(true);
  expect(container.querySelector('[aria-label="Replay position"]')).toBeNull();
  expect(container.textContent).toContain("hidden in privacy mode");
});
