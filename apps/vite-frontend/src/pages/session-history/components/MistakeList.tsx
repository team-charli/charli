/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/MistakeList.tsx */

import { Mistake } from "@/types/types"
import { Sparkline } from "@/components/ui/charts"

interface Props {
  mistakes: Mistake[]
}

export default function MistakeList({ mistakes }: Props) {
  const grouped = mistakes.reduce<Record<string, Mistake[]>>((acc, m) => {
    acc[m.type] = acc[m.type] ? [...acc[m.type], m] : [m]
    return acc
  }, {})

  // Generate mock sparkline data for each mistake (in a real app, this would come from the API)
  const generateSparklineData = (mistake: Mistake) => {
    // Create a sliding window of percentages based on existing data
    // In a real app, this would be real historical data
    const baseValue = mistake.avg_frequency || 50
    const trendDirection = mistake.trend_arrow === 'up' ? 1 : mistake.trend_arrow === 'down' ? -1 : 0
    
    return Array.from({ length: 7 }, (_, i) => {
      const randomVariation = Math.random() * 10 - 5  // Random variation between -5 and +5
      const trendEffect = trendDirection * i * 2      // Apply trend direction
      return Math.max(0, Math.min(100, baseValue + randomVariation + trendEffect))
    })
  }

  // Helper function to determine sparkline color based on frequency color
  const getSparklineColor = (color: string | null) => {
    if (!color) return "currentColor"
    switch (color) {
      case 'red': return "#ef4444" // red-500
      case 'yellow': return "#eab308" // yellow-500
      case 'green': return "#22c55e" // green-500
      default: return "currentColor"
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cls, arr]) => (
        <div key={cls}>
          <h3 className="text-base sm:text-lg font-semibold mb-1">{cls}</h3>
          <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-3">
            {arr
              .sort((a, b) => (b.session_count ?? 0) - (a.session_count ?? 0))
              .map((m) => {
                const sparklineData = generateSparklineData(m)
                return (
                  <div key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
                    <span className="flex-1 break-words truncate lg:max-w-[18rem]">{m.text}</span>
                    <span className="text-center flex items-center gap-1">
                      {m.avg_frequency?.toFixed(1) ?? '—'}{' '}
                      {m.trend_arrow === 'up' ? '↑' : m.trend_arrow === 'down' ? '↓' : ''}
                      <Sparkline 
                        data={sparklineData}
                        className="hidden sm:inline-block ml-1"
                        stroke={getSparklineColor(m.session_frequency_color)}
                        height={16}
                        width={60}
                        aria-label={`Trend for ${m.text}`}
                      />
                    </span>
                    <span
                      style={{
                        color: m.session_frequency_color
                          ? getSparklineColor(m.session_frequency_color)
                          : 'inherit',
                        fontWeight: 500
                      }}
                    >
                      {m.session_count ?? 1}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
