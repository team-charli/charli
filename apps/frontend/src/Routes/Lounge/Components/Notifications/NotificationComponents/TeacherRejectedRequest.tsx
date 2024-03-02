type TeacherRejectedRequestProps = {}

const TeacherRejectedRequest = (props: TeacherRejectedRequestProps ) => {
  return (
    <ul>
      <li>{`${teacherName} deeply regrets they can not satisfy the request to learn ${language}`}</li>
      <li>{`Would you like to schedule with ${randomTeacher} instead?`}</li>
      <li>{yes}</li>
      <li>{no}</li>
    </ul>

  )
}
export default TeacherRejectedRequest
