import { Link } from '@tanstack/react-router';
import React from 'react';

type ButtonLinkPropTypes = {
  path: string;
  children: React.ReactNode | ((state: { isActive: boolean; isTransitioning: boolean }) => React.ReactNode);
  onButtonClick?: React.MouseEventHandler<"a">;
} & Omit<React.AnchorHTMLAttributes<"a">, 'href'>;

const ButtonLink = ({ path, children, onButtonClick, ...rest }: ButtonLinkPropTypes) => {
  const handleClick: React.MouseEventHandler<"a"> = (e) => {
    if (onButtonClick) {
      onButtonClick(e);
    }
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      className="w-44 p-3 rounded-lg bg-gray-300 text-center block "
      {...rest}
    >
      {typeof children === 'function'
        ? (state) => children(state)
        : children}
    </Link>
  );
}

export default ButtonLink;
