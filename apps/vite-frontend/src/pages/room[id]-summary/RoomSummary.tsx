//RoomSummary.tsx
import { useRoomSummaryData } from "./hooks/useRoomSummaryData";

function RoomSummary() {
  const { data } = useRoomSummaryData();

  if (!data) {
    return <div>No session data found.</div>;
  }

  const {
    teacherData,
    learnerData,
    scenario,
    timestamp,
    roomId,
  } = data;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Room Summary</h1>

      <div className="border p-3 rounded">
        <h2 className="font-semibold text-lg mb-2">Session Info</h2>
        <p><strong>Room ID:</strong> {roomId}</p>
        <p><strong>Scenario:</strong> {scenario}</p>
        <p><strong>Timestamp:</strong> {new Date(timestamp).toLocaleString()}</p>
      </div>

      <div className="border p-3 rounded">
        <h2 className="font-semibold text-lg mb-2">Teacher</h2>
        <p><strong>Role:</strong> {teacherData.role}</p>
        <p><strong>Peer ID:</strong> {teacherData.peerId}</p>
        <p><strong>Room ID:</strong> {teacherData.roomId}</p>
        <p><strong>Joined At:</strong> {teacherData.joinedAt}</p>
        <p><strong>Left At:</strong> {teacherData.leftAt}</p>
        <p><strong>Fault Time:</strong> {teacherData.faultTime ?? "N/A"}</p>
        <p><strong>Duration:</strong> {teacherData.duration}</p>
        <p><strong>Hashed Teacher Address:</strong> {teacherData.hashedTeacherAddress}</p>
        <p><strong>Hashed Learner Address:</strong> {teacherData.hashedLearnerAddress}</p>
        <p><strong>Session Duration:</strong> {teacherData.sessionDuration}</p>
        <p><strong>Session Success:</strong> {String(teacherData.sessionSuccess)}</p>
        <p><strong>Fault Type:</strong> {teacherData.faultType ?? "N/A"}</p>
        <p><strong>Session Complete:</strong> {String(teacherData.sessionComplete)}</p>
        <p><strong>Is Fault:</strong> {String(teacherData.isFault)}</p>
      </div>

      <div className="border p-3 rounded">
        <h2 className="font-semibold text-lg mb-2">Learner</h2>
        <p><strong>Role:</strong> {learnerData.role}</p>
        <p><strong>Peer ID:</strong> {learnerData.peerId}</p>
        <p><strong>Room ID:</strong> {learnerData.roomId}</p>
        <p><strong>Joined At:</strong> {learnerData.joinedAt}</p>
        <p><strong>Left At:</strong> {learnerData.leftAt}</p>
        <p><strong>Fault Time:</strong> {learnerData.faultTime ?? "N/A"}</p>
        <p><strong>Duration:</strong> {learnerData.duration}</p>
        <p><strong>Hashed Teacher Address:</strong> {learnerData.hashedTeacherAddress}</p>
        <p><strong>Hashed Learner Address:</strong> {learnerData.hashedLearnerAddress}</p>
        <p><strong>Session Duration:</strong> {learnerData.sessionDuration}</p>
        <p><strong>Session Success:</strong> {String(learnerData.sessionSuccess)}</p>
        <p><strong>Fault Type:</strong> {learnerData.faultType ?? "N/A"}</p>
        <p><strong>Session Complete:</strong> {String(learnerData.sessionComplete)}</p>
        <p><strong>Is Fault:</strong> {String(learnerData.isFault)}</p>
      </div>
    </div>
  );
}
export default RoomSummary;
