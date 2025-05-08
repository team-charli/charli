/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/MistakeList.tsx */

import { Mistake } from "@/types/types"

interface Props {
  mistakes: Mistake[]
}

export default function MistakeList({ mistakes }: Props) {
  const grouped = mistakes.reduce<Record<string, Mistake[]>>((acc, m) => {
    acc[m.type] = acc[m.type] ? [...acc[m.type], m] : [m]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cls, arr]) => (
        <div key={cls}>
          <h3 className="text-base sm:text-lg font-semibold mb-1">{cls}</h3>
          <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-3">
            {arr
              .sort((a, b) => (b.session_count ?? 0) - (a.session_count ?? 0))
              .map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-2 hover:bg-gray-100 rounded">
                  <span className="flex-1 break-words truncate lg:max-w-[22rem]">{m.text}</span>
                  <span className="w-20 text-center">
                    {m.avg_frequency?.toFixed(1) ?? '—'}{' '}
                    {m.trend_arrow === 'up' ? '↑' : m.trend_arrow === 'down' ? '↓' : ''}
                  </span>
                  <span
                    className={
                      m.session_frequency_color
                        ? `text-${m.session_frequency_color}-600 font-medium`
                        : ''
                    }
                  >
                    {m.session_count ?? 1}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
