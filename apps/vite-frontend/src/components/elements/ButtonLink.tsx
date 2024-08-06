import { Link } from '@tanstack/react-router';
import React from 'react';

type ButtonLinkPropTypes = {
  path: string;
  children: React.ReactNode | ((state: { isActive: boolean; isTransitioning: boolean }) => React.ReactNode);
  onButtonClick?: React.MouseEventHandler<"a">;
} & Omit<React.AnchorHTMLAttributes<"a">, 'href'>;

const ButtonLink = ({ path, children, onButtonClick, ...rest }: ButtonLinkPropTypes) => {
  const handleClick: React.MouseEventHandler<"a"> = (e) => {
    console.log("ButtonLink clicked");
    console.log("Path:", path);

    if (onButtonClick) {
      console.log("Calling onButtonClick");
      onButtonClick(e);
    }

    console.log("After onButtonClick");
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      className="w-44 p-3 rounded-lg bg-gray-300 text-center block"
      {...rest}
    >
      {typeof children === 'function'
        ? (state) => children(state)
        : children}
    </Link>
  );
}

export default ButtonLink;
