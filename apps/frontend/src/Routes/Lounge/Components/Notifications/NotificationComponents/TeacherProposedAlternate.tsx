type TeacherProposedAlternateProps = {}

const TeacherProposedAlternate = (props: TeacherProposedAlternateProps ) => {
  return (
    <ul>
      <li>{`${teacherName} has proposed an alternate date for learning ${language}. Would you like to accept?`}</li>
      <li>{yes}</li>
      <li>{no}</li>
    </ul>
  )
}

export default TeacherProposedAlternate;
