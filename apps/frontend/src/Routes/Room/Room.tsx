import { RouteComponentProps } from 'react-router-dom';

interface MatchParams {
  id: string;
}
const Room: React.FC<RouteComponentProps<MatchParams>> = ( {match} ) => {
  const roomId = match.params.id



  return (
    null
  )
}

export default Room
