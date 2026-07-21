import { Fragment } from "react";
import { Text, View } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import type { DailyViewCount } from "@/lib/properties";

const CHART_HEIGHT = 120;
const BAR_GAP = 3;

/**
 * Minimal dependency-free bar chart (built on react-native-svg, already a project
 * dependency) — deliberately avoids pulling in a full charting library for a single
 * dashboard sparkline. Shows daily view counts over the given window.
 */
export function ViewsOverTimeChart({ data }: { data: DailyViewCount[] }) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl bg-muted-light p-6 dark:bg-muted-dark">
        <Text className="text-xs text-gray-500">No view data yet</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.view_count), 1);
  const chartWidth = Math.max(data.length * 10, 280);
  const barWidth = chartWidth / data.length - BAR_GAP;

  // Label every ~7th bar so the axis doesn't get crowded on a 30-day window.
  const labelEvery = Math.max(Math.ceil(data.length / 5), 1);

  return (
    <View className="rounded-xl bg-muted-light p-3 dark:bg-muted-dark">
      <Text className="mb-2 text-xs font-medium text-gray-500">
        Views — last {data.length} days
      </Text>
      <Svg width="100%" height={CHART_HEIGHT + 20} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 20}`}>
        <Line
          x1={0}
          y1={CHART_HEIGHT}
          x2={chartWidth}
          y2={CHART_HEIGHT}
          stroke="#D9DED9"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = (d.view_count / maxCount) * (CHART_HEIGHT - 8);
          const x = i * (barWidth + BAR_GAP);
          const y = CHART_HEIGHT - barHeight;
          const showLabel = i % labelEvery === 0 || i === data.length - 1;
          const dayLabel = new Date(d.day).getDate().toString();

          return (
            <Fragment key={d.day}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, d.view_count > 0 ? 2 : 0)}
                rx={2}
                fill="#2C7A4B"
                opacity={d.view_count > 0 ? 1 : 0.15}
              />
              {showLabel ? (
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 14}
                  fontSize={9}
                  fill="#8A968E"
                  textAnchor="middle"
                >
                  {dayLabel}
                </SvgText>
              ) : null}
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
