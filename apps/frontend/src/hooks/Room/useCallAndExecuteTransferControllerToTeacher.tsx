import { useEffect, useState } from "react";
import { useSessionContext } from "../../contexts/SessionsContext";
import { calculateSessionCost, checkSessionCompleted } from "../../utils/app";
import { useExecuteTransferControllerToTeacher } from "../LitActions/useExecuteTransferControllerToTeacher";
import useLocalStorage from "@rehooks/local-storage";
import { IRelayPKP } from "@lit-protocol/types";

interface ActionResult {
  roomRole: 'teacher' | 'learner';
  txn: string | null;
  actionSuccess: boolean | null;
}
export const useCallAndExecuteTransferControllerToTeacher = ( roomRole: "learner" | "teacher", timerInitiated: boolean, initTimestamp: string, initTimestampSig: string, timerExpired: boolean, expiredTimestamp: string, expiredTimestampSig: string ) => {
  const [actionResult, setActionResult] = useState<ActionResult>({roomRole, actionSuccess: null, txn: null});
  if (roomRole !== "teacher") {
    setActionResult({roomRole, actionSuccess: null, txn: null})
  };

  const [ currentAccount ] = useLocalStorage<IRelayPKP>("currentAccount")
  const {executeTransferControllerToTeacher} = useExecuteTransferControllerToTeacher();

  const { sessionData } = useSessionContext();

  useEffect(() => {
    if (sessionData) {
      const isSessionComplete = checkSessionCompleted(timerInitiated, initTimestamp, initTimestampSig, timerExpired, expiredTimestamp,expiredTimestampSig, sessionData.requested_session_duration);

      if (isSessionComplete && sessionData) {
        const {requested_session_duration, learner_joined_timestamp, learner_joined_signature, teacher_joined_timestamp, teacher_joined_signature, learner_left_timestamp, learner_left_signature, teacher_left_timestamp, teacher_left_signature, hashed_learner_address,hashed_teacher_address, controller_address, controller_public_key, learner_joined_timestamp_worker_sig, teacher_joined_timestamp_worker_sig, learner_left_timestamp_worker_sig,  teacher_left_timestamp_worker_sig
        } = sessionData;                                                                                                                                    const paymentAmount = calculateSessionCost(requested_session_duration);

        (async () => {
          if (!currentAccount?.ethAddress) throw new Error(`no teacher ethAddress`)
          const actionCallResult = await executeTransferControllerToTeacher(currentAccount.ethAddress, hashed_learner_address, hashed_teacher_address, controller_address, controller_public_key, paymentAmount, learner_joined_timestamp, learner_joined_signature, teacher_joined_timestamp, teacher_joined_signature, learner_left_timestamp, learner_left_signature, teacher_left_timestamp, teacher_left_signature, learner_joined_timestamp_worker_sig, teacher_joined_timestamp_worker_sig, learner_left_timestamp_worker_sig,  teacher_left_timestamp_worker_sig)
          if (actionCallResult.length) {
            setActionResult({roomRole, txn: actionCallResult, actionSuccess: true})
          }
        })();
      }
    }
  }, [sessionData]);

  return actionResult;
}
