//UserItem.tsx
import { useCallback } from "react";
import { ethers, hexlify, randomBytes } from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { Button } from "@headlessui/react";
import { useLearningRequestMutations } from "../hooks/useLearningRequestMutations";
import { useLearningRequestState } from "../hooks/useLearningRequestState";
import { waitForTransaction } from "../utils/waitForTx";
import { useEncryptLearnerAddress } from "../hooks/useEncryptLearnerAddress";
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

  const {  sessionLengthInputValue, setSessionLengthInputValue, toggleDateTimePicker, setToggleDateTimePicker, renderSubmitConfirmation, setRenderSubmitConfirmation, dateTime, setDateTime, sessionDuration, amountDai,  } = learningRequestState;

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
    <>
      <li onClick={() => !renderSubmitConfirmation && setToggleDateTimePicker((prev: boolean) => !prev)} className="cursor-pointer">
        <u>{userName}</u>
      </li>
      {toggleDateTimePicker && !renderSubmitConfirmation && (
        <div className="__dateTimePicker space-x-2">
          <span>When?</span>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <SessionLengthInput sessionLength={sessionLengthInputValue} setSessionLength={setSessionLengthInputValue} />
          <button
            onClick={handleSubmitLearningRequest}
            className="p-1 rounded"
            disabled={signSessionDurationAndSecureSessionId.isPending || executePermitAction.isPending || signSessionDurationAndSecureSessionId.isPending}
          >
            Submit
          </button>
        </div>
      )}
      {renderSubmitConfirmation && (
        <>
          <div className="submissionConfirmation">
            Session Request Submitted
          </div>
          <Button
            className="relative w-11 bg-white border border-gray-300 rounded-md shadow-sm py-2 flex items-center justify-center cursor-default focus:outline-none sm:text-sm flex-shrink-0"
            onClick={okHandler}
            onMouseDown={(e) => {
              e.currentTarget.classList.add('ring-1', 'ring-indigo-500', 'border-indigo-500');
            }}
            onMouseUp={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-indigo-500', 'border-indigo-500');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-indigo-500', 'border-indigo-500');
            }}
          >
            Ok
          </Button>
        </>
      )}
    </>
  );
};

export default UserItem;
