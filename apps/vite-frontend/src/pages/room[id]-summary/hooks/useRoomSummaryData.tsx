//useRoomSummaryData.tsx
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/contexts/AuthContext";
import type { PinataPayload } from "@/types/types";

export function useRoomSummaryData() {
  const { data: supabaseClient } = useSupabaseClient();
  const { id: roomId } = useParams({ from: "/room-summary/$id" });

  const fetchRoomSummary = async (): Promise<PinataPayload> => {
    if (!roomId) throw new Error("No room ID available in route params.");
    if (!supabaseClient) throw new Error("Supabase client not available.");

    // 1. Fetch CID from Supabase
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from("sessions")
      .select("finalized_ipfs_cid")
      .eq("huddle_room_id", roomId)
      .single();

    if (sessionError) throw new Error(sessionError.message);
    if (!sessionData?.finalized_ipfs_cid) throw new Error("No IPFS CID found for this session.");

    const ipfsCID = sessionData.finalized_ipfs_cid;

    // 2. Fetch pinned data through your Cloudflare Worker proxy
    const proxyUrl = `https://ipfs-proxy-worker.charli.chat/ipfs/${ipfsCID}`;

    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Failed to fetch data from IPFS proxy: ${res.statusText}`);

    const pinned = await res.json();

    // Optional runtime check to ensure fields exist
    if (
      !('transactionHash' in pinned) ||
      !('pinnedAt' in pinned) ||
      !('teacherData' in pinned) ||
      !('learnerData' in pinned)
    ) {
      throw new Error("Pinned data shape has changed or is missing expected fields.");
    }

    return pinned as PinataPayload;
  };

  const { data, error, isLoading, isError } = useQuery<PinataPayload>({
    queryKey: ["roomSummary", roomId],
    queryFn: fetchRoomSummary,
    enabled: !!roomId && !!supabaseClient,
  });

  return {
    data,
    error: isError ? (error as Error) : null,
    isLoading,
  };
}
