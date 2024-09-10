//UserItem.tsx
import { useCallback } from "react";
import { hexlify, randomBytes } from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { Button } from "@headlessui/react";
import { useUserItem } from "../hooks/useUserItem";

interface UserItemProps {
  userName: string;
  userID: number;
  lang: string;
  modeView: "Learn" | "Teach";
}

const UserItem = ({ userName, userID, lang, modeView }: UserItemProps) => {
  const [loggedInUserId] = useLocalStorage<number>("userID");
  const isLearnMode = modeView === "Learn";

  const userItemHook = useUserItem(isLearnMode);

  if (!isLearnMode) {
    return <li key={userID}>{userName}</li>;
  }

  if (!userItemHook) {
    return null; // or some loading state
  }

  const {
    learningRequestState,
    generateControllerData,
    signSessionDuration,
    executeApproveFundControllerAction,
    submitLearningRequest,
    signApproveTransaction
  } = userItemHook;

  const generateSecureSessionId = useCallback(() => {
    return hexlify(randomBytes(16));
  }, []);

  if (!isLearnMode) {
    return <li key={userID}>{userName}</li>;
  }

  if (!learningRequestState) {
    return null; // or some loading state
  }

// UserItem.tsx
const handleSubmitLearningRequest = useCallback(async () => {
  if (!isLearnMode || !learningRequestState) return;
  const { sessionDuration, dateTime, setRenderSubmitConfirmation } = learningRequestState;
  if (sessionDuration && loggedInUserId) {
    try {
      const newControllerData = generateControllerData();
      const newSecureSessionId = generateSecureSessionId();

      const signedTx = await signApproveTransaction.mutateAsync();

      const approveResult = await executeApproveFundControllerAction.mutateAsync(signedTx);

      if (approveResult.success) {
        await submitLearningRequest.mutateAsync({
          dateTime,
          teacherID: userID,
          userID: loggedInUserId,
          teachingLang: lang,
          sessionDuration,
          secureSessionId: newSecureSessionId,
          controllerData: newControllerData,
          learnerSignedSessionDuration:
        });
        setRenderSubmitConfirmation(true);
      } else {
        throw new Error("Approval transaction failed");
      }
    } catch (error) {
      console.error("Error in submit process:", error);
      // Handle error (e.g., show error message to user)
    }
  }
}, [isLearnMode, learningRequestState, signApproveTransaction, executeApproveFundControllerAction, submitLearningRequest, loggedInUserId, userID, lang, generateSecureSessionId, generateControllerData]);


  const okHandler = () => {
    learningRequestState.setRenderSubmitConfirmation(false);
  };

  const {
    renderSubmitConfirmation,
    toggleDateTimePicker,
    setToggleDateTimePicker,
    dateTime,
    setDateTime,
    sessionLengthInputValue,
    setSessionLengthInputValue
  } = learningRequestState;

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
            disabled={signSessionDuration.isPending || executeApproveFundControllerAction.isPending || submitLearningRequest.isPending}
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
