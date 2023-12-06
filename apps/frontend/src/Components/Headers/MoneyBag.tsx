import { Link } from 'react-router-dom'
type Props = {}

const MoneyBag = (props: Props) => {
  return (
    <Link to="/bolsa"><p className="text-5xl mt-5 ml-16">💰</p></Link>
  )
}

export default MoneyBag
