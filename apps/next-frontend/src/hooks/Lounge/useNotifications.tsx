// hooks/useNotifications.ts
import { useNotificationContext } from '@/contexts/NotificationContext';
import { NotificationIface} from '@/types/types';

export const useNotifications = (modeView: "learn" | "teach" ): NotificationIface[] => {
  const { notificationsContextValue } = useNotificationContext();

  return notificationsContextValue.reduce((acc: NotificationIface[], sessionRow) => {
    let notification: NotificationIface | null = null;

    const baseNotification: Partial<NotificationIface> = {
      type: modeView.toLowerCase() as 'learn' | 'teach',
      session_id: sessionRow.session_id,
      request_time_date: sessionRow.request_time_date,
      teacherName: sessionRow.teacherName,
      learnerName: sessionRow.learnerName,
      teacher_id: sessionRow.teacher_id,
      learner_id: sessionRow.learner_id,
      teaching_lang: sessionRow.teaching_lang,
      request_origin_type: sessionRow.request_origin_type,
      controller_address: sessionRow.controller_address,
      controller_claim_user_id: sessionRow.controller_claim_user_id,
      controller_public_key: sessionRow.controller_public_key,
      controller_claim_keyid: sessionRow.controller_claim_keyid,
      requested_session_duration: sessionRow.requested_session_duration,
      hashed_learner_address: sessionRow.hashed_learner_address,
      hashed_teacher_address: sessionRow.hashed_teacher_address
    };

    if (sessionRow.isProposed) {
      notification = { ...baseNotification, subType: 'sentLearningRequest' } as NotificationIface;
    } else if (sessionRow.isAccepted) {
      notification = {
        ...baseNotification,
        subType: 'confirmedLearningRequest',
        confirmed_time_date: sessionRow.confirmed_time_date,
        roomId: "YourRoomLinkHere"
      } as NotificationIface;
    } else if (sessionRow.isAmended) {
      notification = {
        ...baseNotification,
        subType: 'teacherProposedAlternate',
        counter_time_date: sessionRow.counter_time_date
      } as NotificationIface;
    } else if (sessionRow.isRejected) {
      notification = {
        ...baseNotification,
        subType: 'teacherRejectedRequest',
        session_rejected_reason: sessionRow.session_rejected_reason
      } as NotificationIface;
    }

    if (notification) {
      acc.push(notification);
    }

    return acc;
  }, []);
};
