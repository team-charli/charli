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
      className="w-44 p-3 rounded-lg bg-gray-300 text-center block"
      {...rest}
    >
      {typeof children === 'function'
        ? (routerState) => children(routerState)
        : children
      }
    </Link>
  );
};

export default ButtonLink;
