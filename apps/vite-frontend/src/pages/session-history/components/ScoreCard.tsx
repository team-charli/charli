/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/Scorecard.tsx */
import CircularMeter from './CircularMeter'
import { Scorecard as ScorecardType } from '../SessionHistory'
import MistakeList from './MistakeList'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface Props {
  scorecard: ScorecardType
  trend: { idx: number; accuracy: number }[]
  idx: number
}

export default function Scorecard({ scorecard, trend, idx }: Props) {
  const { conversation_difficulty, language_accuracy, mistakes } = scorecard

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* meters */}
      <div className="flex flex-col items-center space-y-2 md:col-span-1">
        <CircularMeter value={conversation_difficulty * 10} label="Difficulty" />
        <CircularMeter value={language_accuracy} label="Accuracy" />
        <span
          className={
            language_accuracy < 25
              ? 'text-red-600 text-3xl font-bold'
              : language_accuracy < 75
              ? 'text-yellow-600 text-3xl font-bold'
              : 'text-green-600 text-3xl font-bold'
          }
        >
          {language_accuracy}%
        </span>
      </div>

      {/* trend chart */}
      <div className="md:col-span-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="idx" label={{ value: 'Sessions', position: 'bottom' }} />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Fluency', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Line type="monotone" dataKey="accuracy" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* mistakes */}
      <div className="md:col-span-3">
        <MistakeList mistakes={mistakes} />
      </div>
    </div>
  )
}
