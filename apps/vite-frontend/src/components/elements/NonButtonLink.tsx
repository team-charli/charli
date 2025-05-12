import { ReactNode } from 'react';

interface NonButtonLinkProps {
  children?: ReactNode;
}

const NonButtonLink = ({ children }: NonButtonLinkProps) => (
  <div className="w-full sm:w-40 md:w-44 lg:w-48 p-2 sm:p-2.5 md:p-3 lg:p-4 
    rounded-md sm:rounded-lg 
    bg-gray-200 hover:bg-gray-250 
    text-center 
    shadow-sm 
    border border-gray-300
    transition-colors duration-200">
    <div className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700">{children}</div>
  </div>
);

export default NonButtonLink;
