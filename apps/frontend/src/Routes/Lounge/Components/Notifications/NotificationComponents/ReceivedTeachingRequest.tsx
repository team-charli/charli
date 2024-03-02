type ReceivedTeachingRequestProps = {}

const ReceivedTeachingRequest = (props: ReceivedTeachingRequestProps ) => {
  return (
    <ul>
      <li>{`Charli with ${learnerName} at ${displayLocalTime} ${displayLocalDate}?`}
      </li>
      <li>
      {accept}
      </li>
      <li>{reject}</li>
      <li>{reschedule}</li>
    </ul>
  )
}

export default ReceivedTeachingRequest;
