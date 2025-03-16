// SessionHistory.tsx
import { useLoaderData } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PinataPayload } from '@/types/types';

interface Session {
  session_id: number;
  role: 'teacher' | 'learner';
  teaching_lang: string;
  finalized_ipfs_cid: string;
  created_at: string;
}

type ExpandedSessions = Record<number, boolean>;

function SessionHistory() {
  const sessions = useLoaderData({ from: '/session-history' }) as Session[];
  const [expanded, setExpanded] = useState<ExpandedSessions>({});

  const toggleExpand = (sessionId: number) => {
    setExpanded(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  if (!sessions || sessions.length === 0) return <div>No previous sessions found.</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Session History</h2>

      {sessions.map(session => (
        <SessionHistoryItem
          key={session.session_id}
          session={session}
          expanded={!!expanded[session.session_id]}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}

interface SessionHistoryItemProps {
  session: Session;
  expanded: boolean;
  toggleExpand: (sessionId: number) => void;
}

function SessionHistoryItem({ session, expanded, toggleExpand }: SessionHistoryItemProps) {

  const { data: ipfsData, isLoading } = useQuery<PinataPayload>({
    queryKey: ['ipfsData', session.finalized_ipfs_cid],
    queryFn: () =>
      fetch(`https://ipfs-proxy-worker.charli.chat/ipfs/${session.finalized_ipfs_cid}`).then(res => res.json()),
    staleTime: Infinity,
  });

  return (
    <div className="border rounded mb-2 p-3">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => toggleExpand(session.session_id)}
      >
        <div>
          <strong>{new Date(session.created_at).toLocaleString()}</strong> • {session.role} •{' '}
          {session.teaching_lang}
        </div>
        <div>
          {isLoading ? (
            <span className="text-sm">Loading outcome...</span>
          ) : ipfsData ? (
              <>
                <span>
                  {ipfsData.teacherData.sessionSuccess && ipfsData.learnerData.sessionSuccess
                    ? '✅ Success'
                    : `❌ Fault: ${ipfsData.teacherData.faultType || ipfsData.learnerData.faultType}`}
                </span>
                <span className="ml-2 font-semibold">
                  {ipfsData.scenario === 'fault' ? '+' : ''}
                  {ipfsData.teacherData.sessionSuccess ? `${.3 * ipfsData.learnerData.sessionDuration}` : `${-(.3 * ipfsData.learnerData.sessionDuration)}`} DAI
                </span>
              </>
            ) : (
                <span className="text-sm">No IPFS data found</span>
              )}
        </div>
      </div>

      {expanded && ipfsData && (
        <div className="mt-3 space-y-2">
          <p><strong>Scenario:</strong> {ipfsData.scenario}</p>
          <p>
            <strong>Transaction Hash:</strong>{' '}
            <a
              href={`https://basescan.org/tx/${ipfsData.transactionHash}`}
              target="_blank"
              className="text-blue-600 underline"
            >
              {ipfsData.transactionHash}
            </a>
          </p>
          <p><strong>Fault Type:</strong> {ipfsData.teacherData.faultType || ipfsData.learnerData.faultType || "None"}</p>
          <p><strong>Timestamp:</strong> {new Date(ipfsData.timestamp).toLocaleString()}</p>

          <details className="mt-3">
            <summary className="cursor-pointer font-medium">Detailed Teacher and Learner Info</summary>
            <pre className="mt-2 bg-gray-100 rounded p-2 overflow-auto">
              {JSON.stringify({ teacher: ipfsData.teacherData, learner: ipfsData.learnerData }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default SessionHistory;
