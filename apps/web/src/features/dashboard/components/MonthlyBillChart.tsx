import { useMemo, useState } from "react";

import styles from "./MonthlyBillChart.module.css";

export interface BillTrendPoint {
  /** Short label shown on the x-axis, e.g. "Jan" or "Jan 2026". */
  month: string;
  /** Bill amount for that month. */
  amount: number;
}

export type MonthlyBillChartColor = "primary" | "secondary";

export interface MonthlyBillChartProps {
  data: BillTrendPoint[];
  /** How many of the most recent months to plot. Defaults to all of `data`. */
  monthsToShow?: number;
  /** Brand color the bars are drawn in. */
  color?: MonthlyBillChartColor;
  /** Draw a dashed reference line at the average of the shown months. */
  showAverage?: boolean;
  /** Currency/unit suffix shown in the tooltip, e.g. "pesos". */
  unit?: string;
  height?: number;
}

const VIEW_WIDTH = 320;
const PADDING = { top: 28, right: 8, bottom: 4, left: 8 };
const MAX_BAR_WIDTH = 80;
const BAR_GAP = 12;
const BAR_RADIUS = 6;

function formatValue(value: number): string {
  return Math.round(value).toLocaleString();
}

function topRoundedBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    L ${x + width - r} ${y}
    Q ${x + width} ${y} ${x + width} ${y + r}
    L ${x + width} ${y + height}
    Z`;
}

export function MonthlyBillChart({
  data,
  monthsToShow,
  color = "secondary",
  showAverage = true,
  unit,
  height = 160,
}: MonthlyBillChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    const sliceCount = monthsToShow ?? data.length;
    return data.slice(Math.max(0, data.length - sliceCount));
  }, [data, monthsToShow]);

  const { bars, averageY, baseline } = useMemo(() => {
    const values = points.map((p) => p.amount);
    const max = Math.max(...values, 1);
    const avg = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
    const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = height - PADDING.top - PADDING.bottom;
    const base = PADDING.top + plotHeight;

    const slotWidth = plotWidth / (points.length || 1);
    const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth - BAR_GAP);

    const barList = points.map((p, i) => {
      const slotCenter = PADDING.left + slotWidth * (i + 0.5);
      const barHeight = max === 0 ? 0 : (p.amount / max) * plotHeight;
      return {
        point: p,
        x: slotCenter - barWidth / 2,
        centerX: slotCenter,
        y: base - barHeight,
        width: barWidth,
        height: barHeight,
        slotX: PADDING.left + slotWidth * i,
        slotWidth,
      };
    });

    return {
      bars: barList,
      averageY: max === 0 ? base : base - (avg / max) * plotHeight,
      baseline: base,
    };
  }, [points, height]);

  if (points.length === 0) {
    return (
      <div className={styles.MonthlyBillChart_empty}>No bill history yet</div>
    );
  }

  const lastIndex = bars.length - 1;
  const activeBar = activeIndex !== null ? bars[activeIndex] : null;

  const tooltipAlignRight = activeBar
    ? activeBar.centerX > VIEW_WIDTH * 0.65
    : false;
  const tooltipBelow = activeBar ? activeBar.y > height * 0.55 : false;

  return (
    <div
      className={styles.MonthlyBillChart}
      data-color={color}
      onClick={() => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        className={styles.MonthlyBillChart_svg}
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Monthly bill trend over ${points.length} months, ending at ${points[points.length - 1].month} with ${formatValue(points[points.length - 1].amount)}${unit ? ` ${unit}` : ""}`}
      >
        <line
          className={styles.MonthlyBillChart_gridline}
          x1={PADDING.left}
          x2={VIEW_WIDTH - PADDING.right}
          y1={baseline}
          y2={baseline}
        />

        {showAverage && points.length > 1 && (
          <line
            className={styles.MonthlyBillChart_averageLine}
            x1={PADDING.left}
            x2={VIEW_WIDTH - PADDING.right}
            y1={averageY}
            y2={averageY}
          />
        )}

        {bars.map((bar, i) => (
          <g key={`${bar.point.month}-${i}`}>
            <path
              className={styles.MonthlyBillChart_bar}
              data-current={i === lastIndex}
              data-active={i === activeIndex}
              d={topRoundedBarPath(
                bar.x,
                bar.y,
                bar.width,
                Math.max(bar.height, 1),
                BAR_RADIUS,
              )}
            />
            <rect
              className={styles.MonthlyBillChart_hitArea}
              x={bar.slotX}
              y={PADDING.top}
              width={bar.slotWidth}
              height={baseline - PADDING.top}
              onPointerEnter={() => setActiveIndex(i)}
              onPointerLeave={() =>
                setActiveIndex((current) => (current === i ? null : current))
              }
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex((current) => (current === i ? null : i));
              }}
            />
          </g>
        ))}
      </svg>

      <div
        className={styles.MonthlyBillChart_xLabels}
        style={{
          paddingLeft: `${(PADDING.left / VIEW_WIDTH) * 100}%`,
          paddingRight: `${(PADDING.right / VIEW_WIDTH) * 100}%`,
        }}
      >
        {bars.map((bar, i) => (
          <span
            key={`${bar.point.month}-label-${i}`}
            className={styles.MonthlyBillChart_xLabel}
            data-active={i === activeIndex}
          >
            {bar.point.month}
          </span>
        ))}
      </div>

      {activeBar && (
        <div
          className={styles.MonthlyBillChart_tooltip}
          data-align={tooltipAlignRight ? "right" : "left"}
          data-position={tooltipBelow ? "below" : "above"}
          style={{
            left: `${(activeBar.centerX / VIEW_WIDTH) * 100}%`,
            top: `${(activeBar.y / height) * 100}%`,
          }}
        >
          <p className={styles.MonthlyBillChart_tooltipValue}>
            {formatValue(activeBar.point.amount)}
            {unit ? ` ${unit}` : ""}
          </p>
          <p className={styles.MonthlyBillChart_tooltipLabel}>
            {activeBar.point.month}
          </p>
        </div>
      )}

      {showAverage && points.length > 1 && (
        <div className={styles.MonthlyBillChart_legend}>
          <i className={styles.MonthlyBillChart_legendSwatch} />
          <span>Average</span>
        </div>
      )}
    </div>
  );
}
