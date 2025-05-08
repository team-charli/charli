import { cn } from "@/lib/utils"
import React from "react"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  strokeWidth?: number
  stroke?: string
  fill?: string
  className?: string
  showArea?: boolean
}

export function Sparkline({
  data,
  width = 100,
  height = 24,
  strokeWidth = 1.5,
  stroke = "currentColor",
  fill = "transparent",
  className,
  showArea = false,
}: SparklineProps) {
  if (!data || data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  
  // Avoid division by zero if min and max are the same
  const range = max === min ? 1 : max - min
  
  // Map values to y coordinates
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return [x, y]
  })

  // Create SVG path
  const pathD = points.reduce((acc, [x, y], i) => {
    return acc + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`)
  }, "")

  // Create area path for filled version
  const areaD = showArea
    ? `${pathD} L ${width},${height} L 0,${height} Z`
    : pathD

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <path
        d={showArea ? areaD : pathD}
        fill={showArea ? fill : "transparent"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}