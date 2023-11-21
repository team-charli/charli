import { ReactNode } from 'react';

interface NonButtonLinkPropTypes {
  children: ReactNode;
}
const NonButtonLink = ({ children}: NonButtonLinkPropTypes) =>{
  return (
    <div className="">
    <div className="w-44 p-3 rounded-lg bg-gray-300  text-center">
        <div className="text-2xl">
        {children}
      </div>
    </div>
  </div>
  )
}

export default NonButtonLink


