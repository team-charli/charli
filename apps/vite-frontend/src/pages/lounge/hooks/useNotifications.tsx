// hooks/useNotifications.ts
import { useSessionsContext } from '@/contexts/SessionsContext';
import { NotificationIface, ExtendedSession } from '@/types/types';
import { useLocalStorage } from '@rehooks/local-storage';

export const useNotifications = (): NotificationIface[] => {
  const { sessionsContextValue } = useSessionsContext();
  const [userId] = useLocalStorage<number>("userID");

  return sessionsContextValue.reduce((acc: NotificationIface[], sessionRow: ExtendedSession) => {
    const isLearner = userId === sessionRow.learner_id;

    const baseNotification: Partial<NotificationIface> = {
      session_id: sessionRow.session_id,
      request_origin_type: sessionRow.request_origin_type,
      teacherName: sessionRow.teacherName,
      learnerName: sessionRow.learnerName,
      teacher_id: sessionRow.teacher_id,
      learner_id: sessionRow.learner_id,
      request_time_date: sessionRow.request_time_date,
      confirmed_time_date: sessionRow.confirmed_time_date,
      counter_time_date: sessionRow.counter_time_date,
      session_rejected_reason: sessionRow.session_rejected_reason,
      roomId: sessionRow.huddle_room_id,
      teaching_lang: sessionRow.teaching_lang,
      controller_address: sessionRow.controller_address,
      controller_public_key: sessionRow.controller_public_key,
      requested_session_duration: sessionRow.requested_session_duration,
      hashed_learner_address: sessionRow.hashed_learner_address,
      hashed_teacher_address: sessionRow.hashed_teacher_address,
      isImminent: sessionRow.isImminent,
      isNotificationExpired: sessionRow.isNotificationExpired,
      isSessionExpired: sessionRow.isSessionExpired
    };

    let notification: NotificationIface | null = null;

    if (sessionRow.isProposed) {
      notification = {
        ...baseNotification,
        subType: isLearner ? 'sentLearningRequest' : 'receivedTeachingRequest'
      } as NotificationIface;
    } else if (sessionRow.isAccepted) {
      notification = {
        ...baseNotification,
        subType: isLearner ? 'confirmedLearningRequest' : 'confirmedTeachingSession'
      } as NotificationIface;
    } else if (sessionRow.isAmended) {
      notification = {
        ...baseNotification,
        subType: isLearner ? 'teacherProposedAlternate' : 'proposedAlternateTime'
      } as NotificationIface;
    } else if (sessionRow.isRejected) {
      notification = {
        ...baseNotification,
        subType: isLearner ? 'teacherRejectedRequest' : 'rejectedTeachingRequest'
      } as NotificationIface;
    }

    if (notification) {
      acc.push(notification);
    }

    return acc;
  }, []);
};
