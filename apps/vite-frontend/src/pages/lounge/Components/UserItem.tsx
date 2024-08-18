import { useCallback } from "react";
import { hexlify, randomBytes } from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { Button } from "@headlessui/react";
import { userUserItemHooks } from "@/hooks/Lounge/userUserItemHooks";

const contractAddress = import.meta.env.VITE_USDC_SEPOLIA_CONTRACT_ADDRESS;

interface UserItemProps {
  userName: string;
  userID: number;
  lang: string;
  modeView: "Learn" | "Teach";
}

const UserItem = ({ userName, userID, lang, modeView }: UserItemProps) => {
  const [loggedInUserId] = useLocalStorage<number>("userID");
  const isLearnMode = modeView === "Learn";

  const hooks = userUserItemHooks(isLearnMode, userID, lang, loggedInUserId);

  const generateSecureSessionId = useCallback(() => {
    return hexlify(randomBytes(16));
  }, []);

  if (!isLearnMode) {
    return <li key={userID}>{userName}</li>;
  }

  if (!hooks) {
    return null; // or some loading state
  }

  const {
    learningRequestState,
    controller_address,
    signSessionDuration,
    signApproveFundControllerMutation,
    submitLearningRequestMutation,
    isSigningSessionDuration
  } = hooks;
  const handleSubmitLearningRequest = useCallback(async () => {
    if (!isLearnMode || !learningRequestState) return;

    const { sessionDuration, dateTime, amount, setRenderSubmitConfirmation } = learningRequestState;

    if (sessionDuration && loggedInUserId) {
      try {
        const newSecureSessionId: string = generateSecureSessionId();

        const learnerSignedSessionDuration = await signSessionDuration({
          duration: sessionDuration,
          secureSessionId: newSecureSessionId
        });

        await signApproveFundControllerMutation.mutateAsync({
          contractAddress,
          spenderAddress: controller_address,
          amount
        });

        submitLearningRequestMutation.mutate({
          dateTime,
          teacherID: userID,
          userID: loggedInUserId,
          teachingLang: lang,
          sessionDuration,
          learnerSignedSessionDuration,
          secureSessionId: newSecureSessionId
        }, {
          onSuccess: () => setRenderSubmitConfirmation(true),
          onError: (error) => console.error("Error submitting learning request:", error),
        });
      } catch (error) {
        console.error("Error in submit process:", error);
      }
    }
  }, [isLearnMode, learningRequestState, signSessionDuration, signApproveFundControllerMutation, submitLearningRequestMutation, loggedInUserId, userID, lang, controller_address, generateSecureSessionId]);

  const okHandler = () => {
    learningRequestState?.setRenderSubmitConfirmation(false);
  };

  if (!isLearnMode) {
    return <li key={userID}>{userName}</li>;
  }

  if (!learningRequestState) {
    return null; // or some loading state
  }

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
      <li onClick={() => !renderSubmitConfirmation && setToggleDateTimePicker(prev => !prev)} className="cursor-pointer">
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
            disabled={isSigningSessionDuration || signApproveFundControllerMutation.isPending || submitLearningRequestMutation.isPending}
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
