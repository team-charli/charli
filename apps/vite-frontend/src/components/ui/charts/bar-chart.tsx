import { cn } from "@/lib/utils"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts"
import { ReactNode } from "react"

type DataItem = {
  name: string
  [key: string]: any
}

interface BarChartProps {
  data: DataItem[]
  className?: string
  keys: string[] // Array of keys to create bars for
  colors?: string[] // Array of colors for each bar
  stacked?: boolean
  width?: number | string
  height?: number | string
  margin?: { top: number, right: number, bottom: number, left: number }
  tooltip?: boolean
  legend?: boolean
  xAxis?: boolean
  yAxis?: boolean
  grid?: boolean
  horizontal?: boolean
  children?: ReactNode
  xAxisKey?: string
  barSize?: number
  // Optional function to determine the color for a specific bar/value
  getBarColor?: (value: any, dataKey: string, entry: DataItem) => string
}

export function BarChart({
  data,
  className,
  keys,
  colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"],
  stacked = false,
  width = "100%",
  height = "100%",
  margin = { top: 20, right: 30, bottom: 30, left: 30 },
  tooltip = true,
  legend = true,
  xAxis = true,
  yAxis = true,
  grid = true,
  horizontal = false,
  children,
  xAxisKey = "name",
  barSize,
  getBarColor
}: BarChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsBarChart
          data={data}
          margin={margin}
          layout={horizontal ? "vertical" : "horizontal"}
          barSize={barSize}
        >
          {grid && <CartesianGrid strokeDasharray="3 3" />}
          {xAxis && (
            <XAxis
              dataKey={horizontal ? undefined : xAxisKey}
              type={horizontal ? "number" : "category"}
              hide={!xAxis}
            />
          )}
          {yAxis && (
            <YAxis
              dataKey={horizontal ? xAxisKey : undefined}
              type={horizontal ? "category" : "number"}
              hide={!yAxis}
            />
          )}
          {tooltip && <Tooltip />}
          {legend && <Legend />}
          
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              stackId={stacked ? "stack" : undefined}
              {...(horizontal ? { yAxisId: 0 } : { xAxisId: 0 })}
            >
              {getBarColor && data.map((entry, entryIndex) => (
                <Cell
                  key={`cell-${entryIndex}`}
                  fill={getBarColor(entry[key], key, entry)}
                />
              ))}
            </Bar>
          ))}
          
          {children}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}