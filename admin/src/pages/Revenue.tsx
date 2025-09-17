import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import {
  fetchRevenueTrends,
  type RevenueTrendsPoint,
  type RevenueTrendsResponse,
} from "../api/client";

const RANGE_OPTIONS = [7];

type RangeOption = (typeof RANGE_OPTIONS)[number];

type ChartProps = {
  points: RevenueTrendsPoint[];
  formatAmount: (value: number) => string;
};

export default function RevenuePage() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<RangeOption>(7);

  const revenueQuery = useQuery<RevenueTrendsResponse>({
    queryKey: ["analytics-revenue", range],
    queryFn: () => fetchRevenueTrends({ days: range }),
    keepPreviousData: true,
  });

  const points = revenueQuery.data?.points ?? [];
  const currency = revenueQuery.data?.currency || "RUB";
  const totals = useMemo(() => {
    const total =
      revenueQuery.data?.total ??
      points.reduce((acc, item) => acc + item.total, 0);
    const average =
      revenueQuery.data?.average ?? (points.length ? total / points.length : 0);
    const best = points.reduce<RevenueTrendsPoint | null>((acc, item) => {
      if (!acc || item.total > acc.total) return item;
      return acc;
    }, null);
    return { total, average, best };
  }, [points, revenueQuery.data?.total, revenueQuery.data?.average]);

  const amountFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(i18n.language, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [i18n.language, currency]);

  const formatAmount = (value: number) => amountFormatter.format(value);

  const formatDate = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
    });
  };

  const summaryCards = [
    {
      title: t("analyticsRevenuePage.total"),
      value: formatAmount(totals.total),
    },
    {
      title: t("analyticsRevenuePage.average"),
      value: formatAmount(totals.average),
    },
    {
      title: t("analyticsRevenuePage.bestDay"),
      value:
        totals.best && totals.best.total > 0
          ? `${formatDate(totals.best.date)} · ${formatAmount(
              totals.best.total
            )}`
          : "—",
    },
  ];

  return (
    <div className="stack">
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h2>{t("analyticsRevenuePage.title")}</h2>
        <div
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <span className="muted">{t("analyticsRevenuePage.rangeLabel")}</span>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={option === range ? "btn primary" : "btn ghost"}
              onClick={() => setRange(option)}
              disabled={revenueQuery.isFetching && option === range}
            >
              {t(`analyticsRevenuePage.ranges.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {revenueQuery.isError && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="muted">{t("analyticsRevenuePage.error")}</div>
        </div>
      )}

      {revenueQuery.isLoading ? (
        <div className="muted">
          {t("analyticsRevenuePage.loading") ?? t("dashboardPage.loading")}
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
            {summaryCards.map((card) => (
              <Card key={card.title} title={card.title}>
                <h1>{card.value}</h1>
              </Card>
            ))}
          </div>

          <Card title={t("analyticsRevenuePage.title")}>
            {points.length === 0 ? (
              <div className="muted">{t("analyticsRevenuePage.noData")}</div>
            ) : (
              <RevenueChart points={points} formatAmount={formatAmount} />
            )}
          </Card>

          <Card title={t("analyticsRevenuePage.table.title")}>
            <Table
              data={points}
              columns={[
                {
                  header: t("analyticsRevenuePage.table.date"),
                  key: "date",
                  render: (row: RevenueTrendsPoint) => formatDate(row.date),
                },
                {
                  header: t("analyticsRevenuePage.table.amount"),
                  key: "total",
                  render: (row: RevenueTrendsPoint) => formatAmount(row.total),
                },
              ]}
              pageSize={10}
            />
          </Card>
        </>
      )}
    </div>
  );
}

function RevenueChart({ points, formatAmount }: ChartProps) {
  if (!points.length) return null;
  const maxValue = Math.max(...points.map((p) => p.total), 1);
  const width = Math.max(320, points.length * 36);
  const height = 180;
  const barWidth = Math.max(12, Math.floor(width / points.length) - 8);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} role="img" aria-label="revenue-chart">
        {points.map((point, index) => {
          const barHeight = Math.round(
            (point.total / maxValue) * (height - 40)
          );
          const x = index * (barWidth + 8) + 16;
          const y = height - barHeight - 24;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill="var(--primary)"
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                className="muted"
              >
                {formatAmount(point.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                className="muted"
              >
                {point.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
