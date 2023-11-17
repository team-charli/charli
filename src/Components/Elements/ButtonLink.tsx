import { ReactNode } from 'react';
import { Link } from 'react-router-dom'

interface ButtonLinkPropTypes {
  path: string;
  children: ReactNode;
}
const ButtonLink = ({path, children}: ButtonLinkPropTypes) =>{
  return (
    <div className="">
    <div className="w-44 p-3 rounded-lg bg-gray-300  text-center">
      <Link to={`${path}`}>
        <div className="text-2xl">
        {children}
      </div>
      </Link>
    </div>
  </div>
  )
}

export default ButtonLink
