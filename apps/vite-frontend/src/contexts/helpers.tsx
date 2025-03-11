import { ExtendedSession, Session } from "@/types/types";

export const classifySession = (session: Session): Omit<ExtendedSession, keyof Session> => {
  const isProposed = !!session.request_time_date && !session.confirmed_time_date && !session.counter_time_date && !session.session_rejected_reason;

  const isAmended = !!session.request_time_date && !!session.counter_time_date && !session.confirmed_time_date && !session.session_rejected_reason;

  const isAccepted = !!session.request_time_date && !!session.confirmed_time_date && !session.session_rejected_reason;

  const isRejected = !!session.request_time_date && !session.confirmed_time_date && !!session.session_rejected_reason;

  const isNotificationExpired = session.confirmed_time_date ? checkIfNotificationExpired(session.confirmed_time_date) :
    session.counter_time_date ? checkIfNotificationExpired(session.counter_time_date) :
      session.request_time_date ? checkIfNotificationExpired(session.request_time_date) :
        false; // Default to false if none of the dates are set

  const isSessionExpired = session.confirmed_time_date ? checkIfSessionExpired(session.confirmed_time_date, session.requested_session_duration) : false;

  const THRESHOLD_MINUTES = 10;
  let isImminent = false;
  if (session.confirmed_time_date) {
    const sessionDate = new Date(session.confirmed_time_date).getTime();
    const now = Date.now();
    const differenceInMinutes = (sessionDate - now) / (1000 * 60);
    isImminent = differenceInMinutes > 0 && differenceInMinutes <= THRESHOLD_MINUTES;
  }

  return { isProposed, isAmended, isAccepted, isRejected, isNotificationExpired, isImminent, isSessionExpired };
};

export function checkIfNotificationExpired (dateStr: string): boolean {
  const now = new Date();
  const targetDate = new Date(dateStr);
  return targetDate < now;
}

