import useLocalStorage from "@rehooks/local-storage";
import { payTeacherFromController } from "../../Lit/Actions/PayTeacherFromController";
import { litNodeClient } from "../../utils/lit";

export const usePayTeacherFromControllerAction = () => {
  const [sessionSigs] = useLocalStorage('sessionSigs');
  return callPayTeacherFromController();
    //send to tx relayer
  async function callPayTeacherFromController() {
    let teacherAddress;
    let controllerAddress;
    let controllerPubKey
    const signatures = await litNodeClient.executeJs({
      code: payTeacherFromController,
      sessionSigs,
      jsParams: {
        teacherAddress,
        controllerAddress,
        controllerPubKey
      },
    });
    return signatures;
  }
}
