import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import {
  fetchDriverActivity,
  type DriverActivityResponse,
  type DriverActivityItem,
} from "../api/client";

const RANGE_OPTIONS = [7, 30, 90] as const;
const DEFAULT_LIMIT = 30;

type RangeOption = (typeof RANGE_OPTIONS)[number];

type ChartProps = {
  items: DriverActivityItem[];
  formatNumber: (value: number) => string;
};

type DriverActivitySummary = {
  totalDrivers: number;
  onlineDrivers: number;
  totalCompleted: number;
  totalRevenue: number;
};

export default function DriverActivityPage() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<RangeOption>(30);

  const activityQuery = useQuery<DriverActivityResponse>({
    queryKey: ["analytics-driver-activity", range],
    queryFn: () => fetchDriverActivity({ days: range, limit: DEFAULT_LIMIT }),
    keepPreviousData: true,
  });

  const items = activityQuery.data?.items ?? [];
  const currency = activityQuery.data?.currency || "RUB";

  const summary: DriverActivitySummary = useMemo(() => {
    if (!activityQuery.data) {
      return {
        totalDrivers: items.length,
        onlineDrivers: items.filter((item) => item.online).length,
        totalCompleted: items.reduce((acc, item) => acc + item.completed, 0),
        totalRevenue: items.reduce((acc, item) => acc + item.revenue, 0),
      };
    }
    return {
      totalDrivers: activityQuery.data.totalDrivers,
      onlineDrivers: activityQuery.data.onlineDrivers,
      totalCompleted: activityQuery.data.totalCompleted,
      totalRevenue: activityQuery.data.totalRevenue,
    };
  }, [activityQuery.data, items]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  const currencyFormatter = useMemo(() => {
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

  const formatNumber = (value: number) => numberFormatter.format(value);
  const formatAmount = (value: number) => currencyFormatter.format(value);

  const rangeLabel = useMemo(() => {
    if (!activityQuery.data) return "";
    const start = new Date(activityQuery.data.start);
    const end = new Date(activityQuery.data.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${start.toLocaleDateString(
      i18n.language,
      options
    )} — ${end.toLocaleDateString(i18n.language, options)}`;
  }, [activityQuery.data, i18n.language]);

  const chartItems = useMemo(
    () => items.slice(0, Math.min(items.length, 10)),
    [items]
  );

  const tableData = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        active: item.assigned + item.inProgress,
      })),
    [items]
  );

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
        <div>
          <h2>{t("analyticsDriverActivityPage.title")}</h2>
          {rangeLabel && <div className="muted">{rangeLabel}</div>}
        </div>
        <div
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <span className="muted">
            {t("analyticsDriverActivityPage.rangeLabel")}
          </span>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={option === range ? "btn primary" : "btn ghost"}
              onClick={() => setRange(option)}
              disabled={activityQuery.isFetching && option === range}
            >
              {t(`analyticsDriverActivityPage.ranges.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {activityQuery.isError && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="muted">{t("analyticsDriverActivityPage.error")}</div>
        </div>
      )}

      {activityQuery.isLoading ? (
        <div className="muted">
          {t("analyticsDriverActivityPage.loading") ??
            t("dashboardPage.loading")}
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
            <Card title={t("analyticsDriverActivityPage.totalDrivers")}>
              <h1>{formatNumber(summary.totalDrivers)}</h1>
            </Card>
            <Card title={t("analyticsDriverActivityPage.onlineDrivers")}>
              <h1>{formatNumber(summary.onlineDrivers)}</h1>
            </Card>
            <Card title={t("analyticsDriverActivityPage.completed")}>
              <h1>{formatNumber(summary.totalCompleted)}</h1>
            </Card>
            <Card title={t("analyticsDriverActivityPage.revenue")}>
              <h1>{formatAmount(summary.totalRevenue)}</h1>
            </Card>
          </div>

          <Card title={t("analyticsDriverActivityPage.chartTitle")}>
            {chartItems.length === 0 ? (
              <div className="muted">
                {t("analyticsDriverActivityPage.noData")}
              </div>
            ) : (
              <DriverActivityChart
                items={chartItems}
                formatNumber={formatNumber}
              />
            )}
          </Card>

          <Card title={t("analyticsDriverActivityPage.table.title")}>
            {items.length === 0 ? (
              <div className="muted">
                {t("analyticsDriverActivityPage.noData")}
              </div>
            ) : (
              <Table
                data={tableData}
                columns={[
                  {
                    header: t("analyticsDriverActivityPage.table.driver"),
                    key: "name",
                    render: (row: DriverActivityItem & { active: number }) => (
                      <div>
                        <div>
                          <strong>{row.name || "—"}</strong>
                        </div>
                        <div className="muted">
                          {row.rating != null ? row.rating.toFixed(1) : "—"}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.phone"),
                    key: "phone",
                    render: (row: DriverActivityItem & { active: number }) =>
                      row.phone || "—",
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.status"),
                    key: "status",
                    render: (row: DriverActivityItem & { active: number }) =>
                      row.status || "—",
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.online"),
                    key: "online",
                    render: (row: DriverActivityItem & { active: number }) =>
                      row.online
                        ? t("analyticsDriverActivityPage.onlineYes")
                        : t("analyticsDriverActivityPage.onlineNo"),
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.completed"),
                    key: "completed",
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.active"),
                    key: "active",
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.cancelled"),
                    key: "cancelled",
                  },
                  {
                    header: t("analyticsDriverActivityPage.table.revenue"),
                    key: "revenue",
                    render: (row: DriverActivityItem & { active: number }) =>
                      formatAmount(row.revenue),
                  },
                ]}
                pageSize={10}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function DriverActivityChart({ items, formatNumber }: ChartProps) {
  const labelWidth = 180;
  const barAreaWidth = 360;
  const width = labelWidth + barAreaWidth + 60;
  const rowHeight = 36;
  const height = items.length * rowHeight + 32;
  const maxCompleted = Math.max(...items.map((item) => item.completed), 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="driver-activity-chart"
      >
        {items.map((item, index) => {
          const y = index * rowHeight + 24;
          const barLength = Math.max(
            8,
            Math.round((item.completed / maxCompleted) * barAreaWidth)
          );
          return (
            <g key={item.driverId || item.name || index}>
              <text
                x={8}
                y={y}
                alignmentBaseline="middle"
                fontSize={12}
                className="muted"
              >
                {item.name || "—"}
              </text>
              <rect
                x={labelWidth}
                y={y - 12}
                width={barLength}
                height={24}
                fill="var(--primary)"
                rx={6}
              />
              <text
                x={labelWidth + barLength + 8}
                y={y}
                alignmentBaseline="middle"
                fontSize={12}
                className="muted"
              >
                {formatNumber(item.completed)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
