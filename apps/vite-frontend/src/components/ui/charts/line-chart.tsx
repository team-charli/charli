import { cn } from "@/lib/utils"
import {
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from "recharts"

interface LineChartProps {
  data: any[]
  className?: string
  xAxisKey?: string
  dataKey: string
  showDots?: boolean
  lineColor?: string
  stroke?: string
  strokeWidth?: number
  width?: number | string
  height?: number | string
  margin?: { top: number, right: number, bottom: number, left: number }
  tooltip?: boolean
  xAxisLabel?: { value: string, position: "top" | "right" | "bottom" | "left" | "center" | "insideTop" | "insideRight" | "insideBottom" | "insideLeft" | "insideTopRight" | "insideTopLeft" | "insideBottomRight" | "insideBottomLeft" }
  yAxisLabel?: { value: string, angle: number, position: "top" | "right" | "bottom" | "left" | "center" | "insideTop" | "insideRight" | "insideBottom" | "insideLeft" | "insideTopRight" | "insideTopLeft" | "insideBottomRight" | "insideBottomLeft" }
  yAxisDomain?: [number, number]
  showGrid?: boolean
  gridStrokeDasharray?: string
}

export function LineChart({
  data,
  className,
  xAxisKey = "idx",
  dataKey,
  showDots = true,
  lineColor = "#3b82f6", // blue-500
  stroke,
  strokeWidth = 2,
  width = "100%",
  height = "100%",
  margin = { top: 10, right: 30, bottom: 30, left: 30 },
  tooltip = true,
  xAxisLabel,
  yAxisLabel,
  yAxisDomain,
  showGrid = true,
  gridStrokeDasharray = "3 3"
}: LineChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsLineChart data={data} margin={margin}>
          {showGrid && <CartesianGrid strokeDasharray={gridStrokeDasharray} />}
          <XAxis 
            dataKey={xAxisKey} 
            label={xAxisLabel} 
          />
          <YAxis 
            domain={yAxisDomain || ["auto", "auto"]}
            label={yAxisLabel}
          />
          {tooltip && <Tooltip />}
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={stroke || lineColor} 
            strokeWidth={strokeWidth}
            dot={showDots}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}