"use client";

import { useId, useState } from "react";
import { MonetaryField } from "@/components/privacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Clock, Calculator } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/use-api";

import { AccountPicker } from "./account-picker";

interface ManualLeg {
  datetime: string;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  fee: string;
}

function getLocalDatetimeString(offsetMinutes = 0): string {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ManualTradeEntry({ onSaved }: { onSaved: () => void }) {
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [legs, setLegs] = useState<ManualLeg[]>([
    { datetime: getLocalDatetimeString(10), side: "buy", quantity: "1", price: "", fee: "0" },
    { datetime: getLocalDatetimeString(0), side: "sell", quantity: "1", price: "", fee: "0" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();

  const setLeg = (index: number, patch: Partial<ManualLeg>) =>
    setLegs((current) => current.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  const valid =
    Boolean(accountId) &&
    Boolean(symbol.trim()) &&
    legs.some((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "");

  // Real-time estimated round-trip PnL preview
  const estPnl = (() => {
    const buyLegs = legs.filter(
      (l) => l.side === "buy" && Number(l.quantity) > 0 && Number(l.price) > 0,
    );
    const sellLegs = legs.filter(
      (l) => l.side === "sell" && Number(l.quantity) > 0 && Number(l.price) > 0,
    );
    if (buyLegs.length === 1 && sellLegs.length === 1 && buyLegs[0] && sellLegs[0]) {
      const b = buyLegs[0];
      const s = sellLegs[0];
      const qty = Math.min(Number(b.quantity), Number(s.quantity));
      const fees = (Number(b.fee) || 0) + (Number(s.fee) || 0);
      const gross = (Number(s.price) - Number(b.price)) * qty;
      return { gross, net: gross - fees };
    }
    return null;
  })();

  const save = async () => {
    if (!valid || busy) return;
    setError("");

    // Prevent silent drop of incomplete executions
    const partiallyFilled = legs.findIndex(
      (leg) =>
        (leg.price !== "" || Number(leg.quantity) > 0) &&
        (!leg.datetime || !leg.price || !(Number(leg.quantity) > 0)),
    );
    if (partiallyFilled !== -1) {
      setError(
        `Execution ${partiallyFilled + 1} is incomplete. Please ensure Date & time, Quantity, and Price are all entered.`,
      );
      return;
    }

    setBusy(true);
    try {
      await postJson("/api/executions", {
        accountId,
        ...(notes.trim() ? { notes } : {}),
        executions: legs
          .filter((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "")
          .map((leg) => ({
            symbol: symbol.trim().toUpperCase(),
            side: leg.side,
            quantity: Number(leg.quantity),
            price: Number(leg.price),
            fee: leg.fee === "" ? 0 : Number(leg.fee),
            executedAt: new Date(leg.datetime).toISOString(),
          })),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save the trade. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <AccountPicker value={accountId} onChange={setAccountId} kind="manual" />
      <div>
        <Label htmlFor={`${fieldId}-symbol`} className="mb-1 block text-xs text-muted-foreground">
          Symbol
        </Label>
        <Input
          id={`${fieldId}-symbol`}
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          placeholder="AAPL, ESZ6, NQM5, BTCUSDT…"
        />
      </div>

      <div className="space-y-4">
        {legs.map((leg, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5 shadow-sm"
          >
            {/* Header: Leg badge, title, and optional remove button */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand/10 text-brand text-[11px] font-mono font-bold">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {index === 0
                    ? "Entry Execution"
                    : index === 1
                      ? "Exit Execution"
                      : `Execution ${index + 1}`}
                </span>
              </div>
              {legs.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLegs((current) => current.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove leg
                </button>
              )}
            </div>

            {/* Responsive 12-column grid: ample space for every input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* Date & Time: 4 cols */}
              <div className="sm:col-span-2 lg:col-span-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <label htmlFor={`${fieldId}-datetime-${index}`}>Date &amp; time</label>
                  <button
                    type="button"
                    onClick={() => setLeg(index, { datetime: getLocalDatetimeString(0) })}
                    className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-mono"
                  >
                    <Clock className="h-3 w-3" /> Now
                  </button>
                </div>
                <Input
                  id={`${fieldId}-datetime-${index}`}
                  type="datetime-local"
                  value={leg.datetime}
                  onChange={(event) => setLeg(index, { datetime: event.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Side: 2 cols */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground block">Side</label>
                <Select
                  value={leg.side}
                  onValueChange={(value) => setLeg(index, { side: value as "buy" | "sell" })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy (Long)</SelectItem>
                    <SelectItem value="sell">Sell (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity: 2 cols */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground block">Quantity</label>
                <Input
                  placeholder="1"
                  inputMode="decimal"
                  value={leg.quantity}
                  onChange={(event) => setLeg(index, { quantity: event.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Price: 2 cols */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground block">Price</label>
                <MonetaryField>
                  <Input
                    placeholder="0.00"
                    inputMode="decimal"
                    value={leg.price}
                    onChange={(event) => setLeg(index, { price: event.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </MonetaryField>
              </div>

              {/* Fee: 2 cols */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground block">Fee ($)</label>
                <MonetaryField>
                  <Input
                    placeholder="0.00"
                    inputMode="decimal"
                    value={leg.fee}
                    onChange={(event) => setLeg(index, { fee: event.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </MonetaryField>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Estimated P&L calculation box */}
      {estPnl && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calculator className="h-4 w-4 text-brand" />
            <span>Estimated 1-Roundtrip Net Result:</span>
          </div>
          <div className="font-mono text-sm font-bold flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Gross: {estPnl.gross >= 0 ? "+" : ""}${estPnl.gross.toFixed(2)}
            </span>
            <span className={estPnl.net >= 0 ? "text-brand" : "text-loss"}>
              Net: {estPnl.net >= 0 ? "+" : ""}${estPnl.net.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-notes`}>Notes (optional)</Label>
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={100000}
          rows={3}
          placeholder="Your setup, execution notes, or psychology takeaways…"
          className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Markdown supported. Saved executions are stitched into round trips automatically with FIFO
          lot matching.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-1.5"
        >
          <p className="font-semibold">{error}</p>
          {error.includes("Demo mode is read-only") && (
            <p className="text-slate-400">
              You are testing in read-only demo mode. In your private invited journal, trades are
              immediately committed to your isolated SQLite database.{" "}
              <a
                href="https://discord.gg/RUbBagUDA6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline font-medium"
              >
                Request private access on Discord →
              </a>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() =>
              setLegs((current) => [
                ...current,
                {
                  datetime: getLocalDatetimeString(0),
                  side: "sell",
                  quantity: "1",
                  price: "",
                  fee: "0",
                },
              ])
            }
          >
            Add execution leg
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={save}
            disabled={!valid || busy}
            className="bg-brand text-[#04150b] hover:bg-brand/90 font-bold"
          >
            {busy ? "Saving…" : "Save trade"}
          </Button>
        </div>

        {!valid && (
          <span className="text-[11px] text-muted-foreground">
            {!accountId ? "• Select account " : ""}
            {!symbol.trim() ? "• Enter symbol " : ""}
            {legs.every((l) => !l.price) ? "• Enter price " : ""}
          </span>
        )}
      </div>
    </fieldset>
  );
}
