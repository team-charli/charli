import { useEffect, useState } from "react";
import { useSessionContext } from "../../contexts/SessionsContext";
import { calculateSessionCost } from "../../utils/app";
import { useExecuteTransferControllerToTeacher } from "../LitActions/useExecuteTransferControllerToTeacher";
import useLocalStorage from "@rehooks/local-storage";
import { IRelayPKP } from "@lit-protocol/types";

export const useCallExecuteTransferControllerToTeacher = ( roomRole: string ) => {
  if (roomRole !== "teacher") return false;
  const [ currentAccount ] = useLocalStorage<IRelayPKP>("currentAccount")
  const {executeTransferControllerToTeacher} = useExecuteTransferControllerToTeacher();

  const { sessionData } = useSessionContext();
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  useEffect(() => {
    if (
        sessionData?.learner_joined_timestamp &&
        sessionData?.learner_joined_signature &&
        sessionData?.learner_joined_timestamp_worker_sig &&
        sessionData?.teacher_joined_timestamp &&
        sessionData?.teacher_joined_signature &&
        sessionData?.teacher_joined_timestamp_worker_sig &&
        sessionData?.learner_left_timestamp &&
        sessionData?.learner_left_signature &&
        sessionData?.learner_left_timestamp_worker_sig &&
        sessionData?.teacher_left_timestamp &&
        sessionData?.teacher_left_signature &&
        sessionData?.teacher_left_timestamp_worker_sig
    ) {
      setIsSessionComplete(true);
    }
  }, [sessionData]);

  useEffect(() => {
    if (isSessionComplete && sessionData) {
      const {requested_session_duration, learner_joined_timestamp, learner_joined_signature, teacher_joined_timestamp, teacher_joined_signature, learner_left_timestamp, learner_left_signature, teacher_left_timestamp, teacher_left_signature, hashed_learner_address,hashed_teacher_address, controller_address, controller_public_key, learner_joined_timestamp_worker_sig, teacher_joined_timestamp_worker_sig, learner_left_timestamp_worker_sig,  teacher_left_timestamp_worker_sig
      } = sessionData;                                                                                                                                    const paymentAmount = calculateSessionCost(requested_session_duration);

      (async () => {
        if (!currentAccount?.ethAddress) throw new Error(`no teacher ethAddress`)
        await executeTransferControllerToTeacher(currentAccount.ethAddress, hashed_learner_address, hashed_teacher_address, controller_address, controller_public_key, paymentAmount, learner_joined_timestamp, learner_joined_signature, teacher_joined_timestamp, teacher_joined_signature, learner_left_timestamp, learner_left_signature, teacher_left_timestamp, teacher_left_signature, learner_joined_timestamp_worker_sig, teacher_joined_timestamp_worker_sig, learner_left_timestamp_worker_sig,  teacher_left_timestamp_worker_sig)
      })();
    }
  }, [isSessionComplete]);



}
