import { ExtendedSession, Session } from "@/types/types";

export const classifySession = (session: Session): Omit<ExtendedSession, keyof Session> => {
  const isProposed = !!session.request_time_date && !session.confirmed_time_date && !session.counter_time_date && !session.session_rejected_reason;

  const isAmended = !!session.request_time_date && !!session.counter_time_date && !session.confirmed_time_date && !session.session_rejected_reason;

  const isAccepted = !!session.request_time_date && !!session.confirmed_time_date && !session.session_rejected_reason;

  const isRejected = !!session.request_time_date && !session.confirmed_time_date && !!session.session_rejected_reason;

  const isExpired = session.confirmed_time_date ? checkIfNotificationExpired(session.confirmed_time_date) :
    session.counter_time_date ? checkIfNotificationExpired(session.counter_time_date) :
      session.request_time_date ? checkIfNotificationExpired(session.request_time_date) :
        false; // Default to false if none of the dates are set
  return { isProposed, isAmended, isAccepted, isRejected, isExpired };
};

function checkIfNotificationExpired (dateStr: string): boolean {
  const now = new Date();
  const targetDate = new Date(dateStr);
  return targetDate < now; // Returns true if the targetDate is in the past compared to now
}

