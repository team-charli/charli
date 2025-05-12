import { BarChart } from "@/components/ui/charts"
import { Mistake } from "@/types/types"
import { useMemo } from "react"

interface MistakeBarProps {
  mistakes: Mistake[]
}

interface ErrorClassCount {
  name: string
  count: number
  color: string
}

export default function MistakeBar({ mistakes }: MistakeBarProps) {
  const mistakeData = useMemo(() => {
    // Group mistakes by type
    const grouped: Record<string, Mistake[]> = mistakes.reduce((acc, mistake) => {
      if (!acc[mistake.type]) {
        acc[mistake.type] = []
      }
      acc[mistake.type].push(mistake)
      return acc
    }, {} as Record<string, Mistake[]>)

    // Create data for the bar chart
    return Object.entries(grouped).map(([type, typeMistakes]): ErrorClassCount => {
      // Find the most frequent mistake in this type to determine color
      const sortedMistakes = [...typeMistakes].sort(
        (a, b) => (b.session_count ?? 0) - (a.session_count ?? 0)
      )
      
      const topMistake = sortedMistakes[0]
      // Determine color based on mistake frequency color
      const getColorFromFrequency = (freqColor: string | null): string => {
        if (!freqColor) return "#ef4444" // Red fallback
        switch (freqColor) {
          case "red": return "#ef4444"
          case "yellow": return "#eab308"
          case "green": return "#22c55e"
          default: return "#ef4444"
        }
      }
      
      const barColor = getColorFromFrequency(topMistake.session_frequency_color)

      return {
        name: type,
        count: typeMistakes.reduce((sum, m) => sum + (m.session_count ?? 1), 0),
        color: barColor
      }
    })
  }, [mistakes])

  if (!mistakeData.length) {
    return null
  }

  return (
    <>
      {/* Desktop version - stacked bar chart */}
      <div className="w-full h-40 sm:h-56 md:h-64 hidden md:block" aria-label="Mistake distribution chart">
        <h3 className="text-base sm:text-lg font-semibold mb-1">Mistake Distribution</h3>
        <BarChart 
          data={mistakeData}
          keys={["count"]}
          stacked
          legend={false}
          getBarColor={(value, key, entry) => entry.color}
          className="w-full h-full"
        />
      </div>
      
      {/* Mobile version - simple list for counts */}
      <div className="md:hidden" aria-label="Mistake distribution summary">
        <h3 className="text-base font-semibold mb-2">Mistake Distribution</h3>
        <div className="flex flex-wrap gap-3">
          {mistakeData.map(item => (
            <div 
              key={item.name} 
              className="flex items-center gap-2 rounded-md px-3 py-1.5 bg-gray-100 dark:bg-gray-800"
            >
              <div
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.name}:</span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}