import { ExtendedSession } from "../../contexts/NotificationContext";

export const useNotificationRouter = (notifications: ExtendedSession[]) => {
  const teacherToLearnerNotifications = notifications.filter(n => n.isTeacherToLearner);
  const learnerToTeacherNotifications = notifications.filter(n => n.isLearnerToTeacher);

  // Further categorization can be done based on SessionStateFlags
  // Example: Returning categorized notifications for different components
  return {
    teacherToLearnerNotifications,
    learnerToTeacherNotifications,
    // Add more categories as needed
  };
};
