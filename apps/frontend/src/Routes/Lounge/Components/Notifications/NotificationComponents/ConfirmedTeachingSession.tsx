type ConfirmedTeachingSessionProps  = {}

const ConfirmedTeachingSession = (props: ConfirmedTeachingSessionProps) => {
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${learnerName} on ${date} at ${time} `}
      </li>
      <li>
        {`click here when this light 🟡 turns green ${link} `}
      </li>
    </ul>
  )
}
export default ConfirmedTeachingSession
