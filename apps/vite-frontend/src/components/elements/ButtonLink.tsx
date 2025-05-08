import { Link } from '@tanstack/react-router';
import React from 'react';

type ButtonLinkPropTypes = {
  path: string;
  children: React.ReactNode
    | ((state: { isActive: boolean; isTransitioning: boolean }) => React.ReactNode);
  onButtonClick?: React.MouseEventHandler<any>;
} & Omit<React.AnchorHTMLAttributes<any>, 'href'>;

const ButtonLink = ({
  path,
  children,
  onButtonClick,
  ...rest
}: ButtonLinkPropTypes) => {
  const handleClick: React.MouseEventHandler<any> = (e) => {
    if (onButtonClick) {
      onButtonClick(e);
    }
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      className="block w-full py-2 px-4 sm:w-auto sm:min-w-[10rem] sm:py-2.5 md:py-3 md:px-5 lg:py-4 lg:px-6 
      rounded-md sm:rounded-lg md:rounded-lg 
      bg-gray-200 hover:bg-gray-300 
      text-gray-800 font-medium 
      text-sm sm:text-base md:text-lg lg:text-xl 
      text-center 
      transition-colors duration-200 
      shadow-sm hover:shadow
      focus:outline-none focus:ring-2 focus:ring-gray-300"
      {...rest}
    >
      <span className="flex items-center justify-center gap-2">
        {typeof children === 'function'
          ? (routerState) => children(routerState)
          : children
        }
      </span>
    </Link>
  );
};

export default ButtonLink;
