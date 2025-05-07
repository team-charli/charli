//Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/SessionHistory.tsx
import { useLoaderData } from '@tanstack/react-router'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import SessionCard from './components/SessionCard'
import { LoaderReturn } from '@/types/types'


export default function SessionHistory() {
  const { sessions, accuracyTrend } = useLoaderData({ from: '/session-history' }) as LoaderReturn
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!sessions.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center">
          No sessions yet. Schedule one now!
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar
        sessions={sessions}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {sessions.map((s, i) => (
          <SessionCard
            key={s.session_id}
            session={s}
            accuracyTrend={accuracyTrend}
            idx={i}
          />
        ))}
      </main>
    </div>
  )
}
