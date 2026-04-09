"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, LineSeries, createChart, type IChartApi } from "lightweight-charts";

import type { MarketHistoryPoint } from "@/lib/market-history";

type TickerMiniChartProps = {
  symbol: string;
};

type HistoryResponse = {
  ok: true;
  symbol: string;
  history: MarketHistoryPoint[];
};

export function TickerMiniChart({ symbol }: TickerMiniChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [history, setHistory] = useState<MarketHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/internal/market/history?symbol=${encodeURIComponent(symbol)}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "차트 데이터를 불러오지 못했습니다.");
        }
        return response.json() as Promise<HistoryResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setHistory(data.history);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "차트 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const latest = history.at(-1)?.value ?? null;
  const previous = history.at(-2)?.value ?? null;
  const delta = latest !== null && previous !== null ? latest - previous : null;
  const deltaPct = delta !== null && previous ? (delta / previous) * 100 : null;

  const seriesData = useMemo(
    () => history.map((point) => ({ time: point.time as never, value: point.value })),
    [history],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || history.length === 0) return;

    chartRef.current?.remove();
    const chart = createChart(container, {
      autoSize: true,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#38506a",
      },
      grid: {
        vertLines: { color: "rgba(56, 80, 106, 0.08)" },
        horzLines: { color: "rgba(56, 80, 106, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(56, 80, 106, 0.14)",
      },
      timeScale: {
        borderColor: "rgba(56, 80, 106, 0.14)",
      },
      crosshair: {
        vertLine: { color: "rgba(167,112,49,0.35)" },
        horzLine: { color: "rgba(167,112,49,0.35)" },
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: delta !== null && delta < 0 ? "#a35454" : "#19745b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    lineSeries.setData(seriesData);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [delta, history.length, seriesData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            6개월 가격 흐름
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
            {latest !== null ? latest.toLocaleString() : "-"}
          </p>
        </div>
        <div className="text-right text-sm text-[var(--text-muted)]">
          <p>최근 종가 기준</p>
          <p className={delta !== null && delta < 0 ? "text-[#963636]" : "text-[#126652]"}>
            {delta !== null && deltaPct !== null
              ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)} (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(2)}%)`
              : "변동 없음"}
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.72)] p-3">
        {loading ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">
            차트 데이터를 불러오는 중입니다.
          </div>
        ) : error ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-[#963636]">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">
            차트 데이터가 없습니다.
          </div>
        ) : (
          <div ref={containerRef} className="h-[260px] w-full" />
        )}
      </div>
    </div>
  );
}
