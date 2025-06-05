  // src/pages/robo-test/RoboTest.tsx
  import { useEffect, useState } from "react";
  import { useNavigate, useSearch } from "@tanstack/react-router";
  import { useSupabaseClient } from "@/contexts/AuthContext";
  import useLocalStorage from "@rehooks/local-storage";

  export default function RoboTest() {
    const navigate = useNavigate();
    const { deepgramQA } = useSearch({ from: "/robo-test" });
    const { data: supabaseClient } = useSupabaseClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setHuddleAccessToken] = useLocalStorage<string>("huddle-access-token");
    const [userId] = useLocalStorage<number>("userID");

    useEffect(() => {
      async function setupRoboTest() {
        if (!supabaseClient) {
          setError("Supabase client not available");
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          
          // Generate session identifiers
          const tempSessionId = `robo-${Date.now()}`;
          const learnerId = userId || 999; // Use actual user ID if available, or fallback to 999
          
          console.log('Setting up RoboTest with learnerId:', learnerId);

          // 1. Directly create a Huddle room using the edge function
          const { data: roomData, error: roomError } = await
  supabaseClient.functions.invoke('create-huddle-room', {
            body: JSON.stringify({
              // Create a dummy session record with robo- prefix to indicate test mode
              record: { 
                session_id: tempSessionId,
                learner_id: learnerId 
              }
            })
          });

          console.log('RoboTest room creation response:', roomData);
            
          if (roomError) {
            throw new Error(roomError?.message || "Failed to create Huddle room");
          }

          if (!roomData || !roomData.roomId) {
            throw new Error("No roomId returned from create-huddle-room function");
          }

          const roomId = roomData.roomId;
          const sessionId = tempSessionId;

          // 2. Generate Huddle access token
          const { data: tokenData, error: tokenError } = await
  supabaseClient.functions.invoke('create-huddle-access-tokens', {
            body: JSON.stringify({
              roomId,
              role: "learner",
              hashedUserAddress: "0x123robotest"
            })
          });

          console.log('RoboTest access token response:', tokenData);
          
          if (tokenError) {
            console.error('Access token error:', tokenError);
            throw new Error(tokenError?.message || "Failed to generate access token");
          }
          
          if (!tokenData || !tokenData.accessToken) {
            throw new Error("No access token returned from create-huddle-access-tokens function");
          }

          // 3. Store the token in localStorage
          setHuddleAccessToken(tokenData.accessToken);

          // 4. Navigate to the room with roboTest=true and optional deepgramQA
          const searchParams: any = {
            roomRole: "learner",
            hashedLearnerAddress: "0x123robotest",
            hashedTeacherAddress: "0x456robotest",
            controllerAddress: "0x789robotest",
            sessionId: sessionId,
            roboTest: "true",
            learnerId: String(learnerId) // Pass the learner ID in the URL params
          };
          
          // Add deepgramQA parameter if it was passed
          if (deepgramQA === 'true') {
            searchParams.deepgramQA = "true";
          }
          
          navigate({
            to: "/room/$id",
            params: { id: roomId },
            search: searchParams
          });
        } catch (error) {
          console.error("Error setting up RoboTest:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
          setLoading(false);
        }
      }

      setupRoboTest();
    }, [navigate, supabaseClient, setHuddleAccessToken, userId]);

    if (error) {
      return (
        <div className="p-4">
          <h2 className="text-red-500 font-bold">Error setting up RoboTest</h2>
          <p>{error}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Setting up {deepgramQA === 'true' ? 'Deepgram QA' : 'RoboTest'} session...</p>
      </div>
    );
  }
