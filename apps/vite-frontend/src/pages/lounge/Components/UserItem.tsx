//UserItem.tsx
import { useCallback } from "react";
import { ethers, hexlify, randomBytes } from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { useLearningRequestMutations } from "../hooks/useLearningRequestMutations";
import { useLearningRequestState } from "../hooks/useLearningRequestState";
import { waitForTransaction } from "../utils/waitForTx";
import { Dialog } from "@/components/ui/dialog";
import { SessionSchedulerModal } from "./Interactions/Session-Scheduler-Modal";
import { useEncryptAddress } from "../hooks/useEncryptAddress";
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

//TODO: is the picker dialog blocking the request? if the dialog doesn't close the mutation doesn't seem to fire.
//TODO: can't set time picker for the next day
//TODO: can't manually manipulate the text in time picker
  const {  toggleDateTimePicker, setToggleDateTimePicker, schedulerStep, setSchedulerStep, selectedDay, setSelectedDay, selectedTime, setSelectedTime, sessionLengthInputValue, setSessionLengthInputValue, renderSubmitConfirmation, setRenderSubmitConfirmation, dateTime, setDateTime, sessionDuration, amountUsdc } = learningRequestState;

  const encryptLearnerAddress = useEncryptAddress();

  const handleSubmitLearningRequest = useCallback(async () => {
    if (!isLearnMode || !learningRequestState ) return;
    const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL)
    if (sessionDuration && loggedInUserId) {
      try {
        console.log("Starting learning request process");
        console.log("Session Duration:", sessionDuration);
        console.log("Amount USDC:", amountUsdc);
        
        const learnerId = loggedInUserId;
        console.log("Generating controller data for learner ID:", learnerId);
        const { sessionId, ...controllerData } = await generateControllerData(learnerId);
        console.log("Generated controller data:", { sessionId, controllerAddress: controllerData.controller_address });

        const secureSessionId = hexlify(randomBytes(16));
        console.log("Generated secure session ID:", secureSessionId);
        
        console.log("Signing session duration and secure ID");
        const { signature: requestedSessionDurationLearnerSig, sessionDurationData } =
          await signSessionDurationAndSecureSessionId.mutateAsync({
            sessionDuration,
            secureSessionId,
          });
        console.log("Signed session duration data:", sessionDurationData);
        
        console.log("Getting action parameters for USDC permit");
        const actionParams = await signPermitAndCollectActionParams.mutateAsync({
          controllerAddress: controllerData.controller_address, 
          provider, 
          secureSessionId, 
          requestedSessionDurationLearnerSig, 
          sessionDuration, 
          amountScaled: amountUsdc 
        });
        
        console.log("Encrypting learner address");
        const encryptLearnerAddressResult = await encryptLearnerAddress();
        const {ciphertext, dataToEncryptHash} = encryptLearnerAddressResult;
        
        // Handle permit based on USDC allowance
        let permitStatus = "skipped"; // Default to skipped
        
        if (actionParams.skipPermit) {
          console.log("No permit needed. Existing allowance sufficient. Skipping executePermitAction.");
        } else {
          console.log("Permit required. Executing permit action.");
          
          console.log("USDC contract address:", import.meta.env.VITE_USDC_CONTRACT_ADDRESS_BASE_SEPOLIA);
          console.log("Amount USDC scaled:", amountUsdc.toString());
          
          // Execute the permit action and handle errors
          try {
            const result = await executePermitAction.mutateAsync(actionParams);
            console.log("Permit action response successful:", result);
            
            if (!result || typeof result.txHash !== 'string' || !result.txHash.startsWith('0x')) {
              console.error("Invalid transaction hash:", result);
              throw new Error("Invalid transaction hash returned");
            }
            
            console.log("Waiting for transaction:", result.txHash);
            const txInfoObj = await waitForTransaction(provider, result.txHash);
            console.log("Transaction result:", txInfoObj);

            if (txInfoObj.txStatus === "reverted" || txInfoObj.txStatus === "failed") {
              throw new Error(`Transaction failed with status: ${txInfoObj.txStatus}`);
            }
            
            permitStatus = "completed";
            console.log("Transaction confirmed successfully");
          } catch (error) {
            console.error("Permit action error:", error);
            throw new Error(`Permit transaction failed: ${error.message}`);
          }
        }
        
        console.log("Permit status:", permitStatus);
        console.log("Selected DateTime before submission (local):", dateTime);

        await submitLearningRequestToDb.mutateAsync({
          dateTime,
          teacherID: userID,
          userID: loggedInUserId,
          teachingLang: language,
          sessionDuration,
          sessionId,
          secureSessionId,
          learnerSessionDurationSig: requestedSessionDurationLearnerSig,
          ciphertext,
          dataToEncryptHash,
          sessionDurationData
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
          teacherId={userID}
          learnerId={loggedInUserId || 0}
        />
      )}
    </Dialog>
  );
};

export default UserItem;
