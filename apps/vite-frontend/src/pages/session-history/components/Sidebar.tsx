/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/Sidebar.tsx */
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CircularMeter from './CircularMeter'
import { SessionData } from '../SessionHistory'
import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface Props {
  sessions: SessionData[]
  open: boolean
  setOpen: (val: boolean) => void
}

export default function Sidebar({ sessions, open, setOpen }: Props) {
  const router = useRouter()

  // auto-collapse on route changes (mobile)
  useEffect(() => {
    const un = router.subscribe(() => setOpen(false))
    return un
  }, [router, setOpen])

  return (
    <aside
      className={cn(
        'transition-transform duration-300 bg-white border-r shadow-lg md:w-64 w-64 z-20',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="flex items-center justify-between p-4 md:hidden">
        <h2 className="font-semibold">Sessions</h2>
        <Button size="icon" onClick={() => setOpen(false)}>
          ✕
        </Button>
      </div>
      <div className="p-4 space-y-2">
        {sessions.map((s, i) => (
          <Link
            key={s.session_id}
            to="/session-history/$roomId"
            params={{ roomId: String(s.session_id) }}
            className="block"
            activeProps={{ className: 'bg-yellow-200' }}
          >
            <Card className="flex items-center gap-2 p-2">
              <CircularMeter
                value={s.scorecard.language_accuracy}
                size={32}
              />
              <CardContent className="p-0 text-sm truncate">
                {new Date(s.created_at).toLocaleDateString()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </aside>
  )
}
