import { ReactNode } from 'react';

interface NonButtonLinkProps {
  children?: ReactNode;
}

const NonButtonLink = ({ children }: NonButtonLinkProps) => (
  <div className="w-44 p-3 rounded-lg bg-gray-300 text-center">
    <div className="text-2xl">{children}</div>
  </div>
);

export default NonButtonLink;
