/* /Users/zm/Projects/charli/apps/vite-frontend/src/pages/session-history/components/SessionCard.tsx */
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useQuery } from '@tanstack/react-query'
import { PinataPayload, SessionDataHistory } from '@/types/types'
import Scorecard from './ScoreCard'

interface Props {
  session: SessionDataHistory
  accuracyTrend: { idx: number; accuracy: number }[]
  idx: number
}

export default function SessionCard({ session, accuracyTrend, idx }: Props) {
  const { data: ipfsData } = useQuery<PinataPayload>({
    queryKey: ['ipfsData', session.finalized_ipfs_cid],
    queryFn: () =>
      fetch(`https://ipfs-proxy-worker.charli.chat/ipfs/${session.finalized_ipfs_cid}`).then((r) =>
        r.json()
      ),
    staleTime: Infinity
  })

  const outcome =
    ipfsData && ipfsData.teacherData.sessionSuccess && ipfsData.learnerData.sessionSuccess
      ? 'success'
      : 'fault'

  return (
    <Card className="bg-yellow-100 rounded-xl p-4 md:p-6 lg:p-8 space-y-4" id={String(session.session_id)}>
      <CardContent className="p-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span className="font-semibold">
            {new Date(session.created_at).toLocaleString()}
          </span>
          {ipfsData && (
            <span className="font-medium">
              {outcome === 'success' ? '✅ Success' : '❌ Fault'} •{' '}
              {ipfsData.scenario === 'fault' ? '+' : '-'}
              {0.3 * ipfsData.learnerData.sessionDuration} USDC
            </span>
          )}
        </div>

        <Scorecard scorecard={session.scorecard} trend={accuracyTrend} idx={idx} />

        {ipfsData && (
          <Collapsible>
            <CollapsibleTrigger className="text-sm underline">
              {`Click to ${ipfsData ? 'collapse' : 'expand'} financial details`}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-sm md:grid md:grid-cols-2 md:gap-6">
              <div>
                <strong>Scenario:</strong> {ipfsData.scenario}
              </div>
              <div>
                <strong>Transaction Hash:</strong>{' '}
                <a
                  href={`https://basescan.org/tx/${ipfsData.transactionHash}`}
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {ipfsData.transactionHash}
                </a>
              </div>
              <div>
                <strong>Fault Type:</strong>{' '}
                {ipfsData.teacherData.faultType ||
                  ipfsData.learnerData.faultType ||
                  'None'}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
