import {Link} from '@tanstack/react-router';
import { ButtonLinkPropTypes } from '../../types/types'

const ButtonLink = ({ path, children, onButtonClick }: ButtonLinkPropTypes) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // for internal button logic
    if (onButtonClick) {
      onButtonClick(e);
    }
  };

  return (
    <div className="w-44 p-3 rounded-lg bg-gray-300 text-center" onClick={handleClick}>
      <Link href={path}>
        <div className="text-2xl">
          {children}
        </div>
      </Link>
    </div>
  );
}

export default ButtonLink;
