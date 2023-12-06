import { ReactNode } from 'react';

interface GeneralButtonPropTypes {
  path: string;
  children: ReactNode;
}
const GeneralButton = ({path, children}: GeneralButtonPropTypes) =>{
  return (
    <div className="">
    <div className="w-44 p-3 rounded-lg bg-gray-300  text-center">
    </div>
  </div>
  )
}

export default GeneralButton

