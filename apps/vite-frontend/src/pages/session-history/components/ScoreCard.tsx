/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/Scorecard.tsx */
import MistakeList from './MistakeList'
import MistakeBar from './MistakeBar'
import { Scorecard as ScorecardType } from '../SessionHistory'
import {
  LineChart,
  RadialProgress,
  BarChart
} from '@/components/ui/charts'

interface Props {
  scorecard: ScorecardType
  trend: { idx: number; accuracy: number }[]
  idx: number
}

export default function Scorecard({ scorecard, trend, idx }: Props) {
  const { conversation_difficulty, language_accuracy, mistakes } = scorecard

  // Helper function to determine color based on value
  const getColorClass = (value: number) => {
    if (value < 25) return "stroke-red-600 dark:stroke-red-500"
    if (value < 75) return "stroke-yellow-600 dark:stroke-yellow-500"
    return "stroke-green-600 dark:stroke-green-500"
  }

  // Helper function to determine text color based on value
  const getTextColorClass = (value: number) => {
    if (value < 25) return "text-red-600 dark:text-red-500"
    if (value < 75) return "text-yellow-600 dark:text-yellow-500"
    return "text-green-600 dark:text-green-500"
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
      {/* meters */}
      <div className="flex flex-col items-center space-y-2 md:col-span-1">
        {/* 1. Conversation Difficulty Gauge */}
        <RadialProgress 
          value={conversation_difficulty * 10} 
          label="Difficulty" 
          indicatorClassName={getColorClass(conversation_difficulty * 10)}
          aria-label={`Conversation difficulty rating: ${conversation_difficulty} out of 10`}
        />
        
        {/* 2. Language Accuracy Gauge */}
        <div className="relative">
          <RadialProgress 
            value={language_accuracy} 
            label="Accuracy" 
            size={120}
            indicatorClassName={getColorClass(language_accuracy)}
            aria-label={`Language accuracy: ${language_accuracy}%`}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${getTextColorClass(language_accuracy)}`}
          >
            {language_accuracy}%
          </span>
        </div>
      </div>

      {/* 3. Fluency Trend chart */}
      <div className="md:col-span-2 h-40 sm:h-56 md:h-64">
        <LineChart 
          data={trend}
          dataKey="accuracy"
          xAxisKey="idx"
          showDots={false}
          yAxisDomain={[0, 100]}
          xAxisLabel={{ value: 'Sessions', position: 'bottom' }}
          yAxisLabel={{ value: 'Fluency', angle: -90, position: 'insideLeft' }}
          className="w-full h-full"
          aria-label="Fluency trend across sessions"
        />
      </div>

      {/* 4. Per-session Mistake Mix Bar Chart */}
      <div className="md:col-span-3">
        <MistakeBar mistakes={mistakes} />
      </div>

      {/* 5. Mistakes list (with sparklines now added in MistakeList component) */}
      <div className="md:col-span-3">
        <MistakeList mistakes={mistakes} />
      </div>
    </div>
  )
}
