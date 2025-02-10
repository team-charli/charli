//UserItem.tsx
import { useCallback } from "react";
import { ethers, hexlify, randomBytes } from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { useLearningRequestMutations } from "../hooks/useLearningRequestMutations";
import { useLearningRequestState } from "../hooks/useLearningRequestState";
import { waitForTransaction } from "../utils/waitForTx";
import { useEncryptLearnerAddress } from "../hooks/useEncryptLearnerAddress";
import { SessionSchedulerModal } from "./Interactions/Session-Scheduler-Modal";
import { DialogTrigger, Dialog } from "@/components/ui/dialog";
interface UserItemProps {
  userName: string;
  userID: number;
  language: string;
  modeView: "Learn" | "Teach";
}

const UserItem = ({ userName, userID, language, modeView }: UserItemProps) => {
  const [loggedInUserId] = useLocalStorage<number>("userID");
  const isLearnMode = modeView === "Learn";

  const learningRequestFunctions = useLearningRequestMutations();
  const learningRequestState = useLearningRequestState();
  const { generateControllerData, signSessionDurationAndSecureSessionId, executePermitAction, submitLearningRequestToDb, signPermitAndCollectActionParams } = learningRequestFunctions;

  const {  toggleDateTimePicker, setToggleDateTimePicker, schedulerStep, setSchedulerStep, selectedDay, setSelectedDay, selectedTime, setSelectedTime, sessionLengthInputValue, setSessionLengthInputValue, renderSubmitConfirmation, setRenderSubmitConfirmation, dateTime, setDateTime, sessionDuration, amountDai } = learningRequestState;

  const encryptLearnerAddress = useEncryptLearnerAddress();

  const handleSubmitLearningRequest = useCallback(async () => {
    if (!isLearnMode || !learningRequestState ) return;
    const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL)
    if (sessionDuration && loggedInUserId) {
      try {
        const learnerId = loggedInUserId;
        const { sessionId, ...controllerData } = await generateControllerData(learnerId);

        const secureSessionId = hexlify(randomBytes(16));
        const sessionIdAndDurationSig = await signSessionDurationAndSecureSessionId.mutateAsync({sessionDuration, secureSessionId});

        const actionParams = await signPermitAndCollectActionParams.mutateAsync({controllerAddress: controllerData.controller_address, provider, secureSessionId, sessionIdAndDurationSig, sessionDuration, amountScaled: amountDai });

        const encryptLearnerAddressResult = await encryptLearnerAddress()
        const {ciphertext, dataToEncryptHash} = encryptLearnerAddressResult;
        //TODO should Promise.all these because waitForTransaction takes long time

        if (actionParams.skipPermit) {
          console.log("No permit needed. Skipping executePermitAction.");
        } else {
          const {txHash} = await executePermitAction.mutateAsync(actionParams);

          const txInfoObj = await waitForTransaction(provider, txHash)

          if (txInfoObj.txStatus === "reverted" || txInfoObj.txStatus === "failed") throw new Error("halted submit on permitTx reverted || failed")
        }
        //FIX: failing silently
        await submitLearningRequestToDb.mutateAsync({
          dateTime,
          teacherID: userID,
          userID: loggedInUserId,
          teachingLang: language,
          sessionDuration,
          sessionId,
          secureSessionId,
          learnerSessionDurationSig: sessionIdAndDurationSig,
          ciphertext,
          dataToEncryptHash,
        });
        setRenderSubmitConfirmation(true);
      } catch (error) {

        console.error("Error in submitLearningRequestToDb:", error);
        throw new Error("Permit transaction failed");
      }
    }
  }, [isLearnMode, learningRequestState, signPermitAndCollectActionParams, executePermitAction, submitLearningRequestToDb, loggedInUserId, userID, language,  generateControllerData]);


  const okHandler = () => {
    learningRequestState.setRenderSubmitConfirmation(false);
  };

  if (!isLearnMode) {
    return <li key={userID}>{userName}</li>;
  }

  return (
    <Dialog
      open={toggleDateTimePicker}
      onOpenChange={setToggleDateTimePicker}
    >
      <li onClick={() => !renderSubmitConfirmation && setToggleDateTimePicker(true)}
        className="cursor-pointer">
        <u>{userName}</u>
      </li>

      {!renderSubmitConfirmation && (
        <SessionSchedulerModal
          open={toggleDateTimePicker}
          onOpenChange={setToggleDateTimePicker}
          step={schedulerStep}
          setStep={setSchedulerStep}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          sessionLengthInputValue={sessionLengthInputValue}
          setSessionLengthInputValue={setSessionLengthInputValue}
          sessionDuration={sessionDuration}
          userName={userName}
          handleSubmitLearningRequest={handleSubmitLearningRequest}
        />
      )}
    </Dialog>
  );
};

export default UserItem;
