/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/CircularMeter.tsx */
import { SVGProps } from 'react'

interface Props {
  value: number // 0-100
  size?: number
  label?: string
}

export default function CircularMeter({ value, size = 64, label }: Props) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  let stroke = 'stroke-green-600'
  if (value < 25) stroke = 'stroke-red-600'
  else if (value < 75) stroke = 'stroke-yellow-600'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${stroke} transition-all`}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-xs mt-1">{label}</span>}
    </div>
  )
}
